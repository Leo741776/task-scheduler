from calendar import monthrange
import json
import re
from urllib import error, request
from typing import Any, Dict, List

from app.config import settings


TIME_PATTERN = re.compile(r"^\s*(1[0-2]|[1-9])(?::([0-5]\d))?\s*([AaPp][Mm])\s*$")


class AssistantService:
    def __init__(self) -> None:
        self._base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self._model = settings.OLLAMA_MODEL

    def chat(self, messages: List[Dict[str, str]], active_year: int, active_month: int) -> Dict[str, Any]:
        if not self._base_url or not self._model:
            raise RuntimeError("Assistant is not configured. Set OLLAMA_BASE_URL and OLLAMA_MODEL in backend environment.")

        raw_content = self._call_ollama(messages)
        parsed = self._safe_json_loads(raw_content)

        fields = {
            "task_name": parsed.get("task_name"),
            "task_day": parsed.get("task_day"),
            "time_12h": parsed.get("time_12h"),
            "duration_hours": parsed.get("duration_hours"),
            "duration_minutes": parsed.get("duration_minutes"),
        }

        normalized_fields, missing_fields = self._normalize_and_validate(fields, active_year, active_month)

        is_complete = len(missing_fields) == 0
        reply_text = (parsed.get("reply") or "").strip()
        if is_complete:
            if not reply_text:
                reply_text = "Perfect. I have everything I need and will add the task now."
        else:
            reply_text = self._missing_fields_prompt(missing_fields)

        result: Dict[str, Any] = {
            "reply_text": reply_text,
            "is_complete": is_complete,
            "missing_fields": missing_fields,
            "task_draft": normalized_fields if is_complete else None,
        }
        return result

    def _call_ollama(self, messages: List[Dict[str, str]]) -> str:
        url = f"{self._base_url}/api/chat"

        system_text = (
            "You are a helpful task assistant that gathers information to create a calendar event. "
            "You need to collect exactly 5 pieces of information: task name, day, time, and duration (hours and minutes). "
            "\n"
            "REQUIRED FIELDS:\n"
            "1. task_name: What is the task called? (e.g., 'Gym', 'Code review', 'Team meeting')\n"
            "2. task_day: What day of the month? (number from 1-31)\n"
            "3. time_12h: What time? Must be in format like '9 AM', '2:30 PM', '11:45 AM'\n"
            "4. duration_hours: How many hours? (0 or more)\n"
            "5. duration_minutes: How many minutes? (0-59)\n"
            "\n"
            "INSTRUCTIONS:\n"
            "- Use full conversation context to infer any information already provided\n"
            "- Always respond with JSON containing all 5 fields plus a 'reply' message\n"
            "- If all fields are provided and valid, set reply to a confirmation message\n"
            "- If any field is missing, unclear, or invalid, ask politely for clarification on ONLY those fields\n"
            "- Be conversational and friendly, not robotic\n"
            "- Examples of good replies: 'Got it! What day of the month?', 'OK, that\\'s 1 hour 15 minutes. What time works for you?'\n"
            "\n"
            "RESPONSE FORMAT:\n"
            "Always return valid JSON with exactly these keys (use null for unknown): "
            "{\"reply\": \"your message\", \"task_name\": value, \"task_day\": value, \"time_12h\": value, \"duration_hours\": value, \"duration_minutes\": value}"
        )

        chat_messages = [{"role": "system", "content": system_text}]
        for message in messages:
            role = message.get("role")
            content = str(message.get("content", "")).strip()
            if not content:
                continue
            chat_messages.append(
                {
                    "role": "user" if role == "user" else "assistant",
                    "content": content,
                }
            )

        payload = {
            "model": self._model,
            "messages": chat_messages,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
            },
        }

        req = request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"Ollama API error ({exc.code}): {body}") from exc
        except error.URLError as exc:
            raise RuntimeError("Could not connect to Ollama. Start Ollama and ensure it is reachable at OLLAMA_BASE_URL.") from exc

        return self._extract_text_from_ollama_response(data)

    def _extract_text_from_ollama_response(self, data: Dict[str, Any]) -> str:
        message = data.get("message") or {}
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()
        response = data.get("response")
        if isinstance(response, str) and response.strip():
            return response.strip()
        return "{}"

    def _safe_json_loads(self, content: str) -> Dict[str, Any]:
        sanitized = content.strip()
        if sanitized.startswith("```"):
            sanitized = re.sub(r"^```(?:json)?\s*", "", sanitized)
            sanitized = re.sub(r"\s*```$", "", sanitized)

        try:
            loaded = json.loads(sanitized)
            if isinstance(loaded, dict):
                return loaded
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", sanitized)
            if match:
                try:
                    loaded = json.loads(match.group(0))
                    if isinstance(loaded, dict):
                        return loaded
                except json.JSONDecodeError:
                    pass
        return {}

    def _normalize_and_validate(
        self,
        fields: Dict[str, Any],
        active_year: int,
        active_month: int,
    ) -> tuple[Dict[str, Any], List[str]]:
        missing_fields: List[str] = []
        normalized: Dict[str, Any] = {}

        task_name = fields.get("task_name")
        task_name_str = str(task_name).strip() if task_name is not None else ""
        if not task_name_str:
            missing_fields.append("task_name")
        else:
            normalized["task_name"] = task_name_str

        max_day = monthrange(active_year, active_month)[1]
        task_day = self._to_int(fields.get("task_day"))
        if task_day is None or task_day < 1 or task_day > max_day:
            missing_fields.append("task_day")
        else:
            normalized["task_day"] = task_day

        time_12h = self._normalize_time_12h(fields.get("time_12h"))
        if not time_12h:
            missing_fields.append("time_12h")
        else:
            normalized["time_12h"] = time_12h

        duration_hours = self._to_int(fields.get("duration_hours"))
        duration_minutes = self._to_int(fields.get("duration_minutes"))

        if duration_hours is None or duration_hours < 0:
            missing_fields.append("duration_hours")
        if duration_minutes is None or duration_minutes < 0 or duration_minutes > 59:
            missing_fields.append("duration_minutes")

        if duration_hours is not None and duration_minutes is not None:
            if duration_hours == 0 and duration_minutes == 0:
                if "duration_hours" not in missing_fields:
                    missing_fields.append("duration_hours")
                if "duration_minutes" not in missing_fields:
                    missing_fields.append("duration_minutes")

        if "duration_hours" not in missing_fields and duration_hours is not None:
            normalized["duration_hours"] = duration_hours
        if "duration_minutes" not in missing_fields and duration_minutes is not None:
            normalized["duration_minutes"] = duration_minutes

        return normalized, missing_fields

    def _to_int(self, value: Any) -> int | None:
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _normalize_time_12h(self, value: Any) -> str | None:
        if value is None:
            return None
        match = TIME_PATTERN.match(str(value))
        if not match:
            return None

        hour = int(match.group(1))
        minute_group = match.group(2)
        minute = int(minute_group) if minute_group is not None else 0
        period = match.group(3).upper()
        return f"{hour}:{minute:02d} {period}"

    def _missing_fields_prompt(self, missing_fields: List[str]) -> str:
        missing = set(missing_fields)

        if "task_name" in missing:
            return "What should I call this task?"

        if "task_day" in missing:
            return "What day of the month should I schedule it on?"

        if "time_12h" in missing:
            return "What time should it start? Please use AM/PM (for example, 7:30 PM)."

        needs_hours = "duration_hours" in missing
        needs_minutes = "duration_minutes" in missing

        if needs_hours and needs_minutes:
            return "How long should it be? Please share hours and minutes (for example, 1 hour 15 minutes)."
        if needs_hours:
            return "How many hours should the task last?"
        if needs_minutes:
            return "How many minutes should the task last?"

        return "Please share the missing details so I can add your task."
