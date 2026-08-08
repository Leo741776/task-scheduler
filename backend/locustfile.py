"""
locustfile.py
- Performance workload for the COMP490 Task Manager backend.
- Defines a single HttpUser that registers + logs in once per Locust user,
  then exercises a representative CRUD workload (and an optional assistant
  workload via tags).
- Excludes /activities/groups/{task_group_id} from the steady-state mix:
  bulk-delete is exercised in STD-INT-010 and would distort a normal load
  profile if included here.
"""

import os
import random
import time

from locust import HttpUser, between, tag, task


# Used to keep username/email unique across Locust user instances AND
# across reruns of the same Locust process (so the perf DB does not have
# to be reset between runs).
_run_id = f"{int(time.time())}-{os.getpid()}-{random.randint(1000, 9999)}"
_user_counter = 0


def _next_user_id() -> int:
    """Stable per-locust-user index. Not thread-safe in the strict sense
    but Locust spawns users serially enough that collisions are vanishingly
    rare with the additional _run_id suffix."""
    global _user_counter
    _user_counter += 1
    return _user_counter


PASSWORD = "password123"


class TaskManagerUser(HttpUser):
    """A representative authenticated user: registers, logs in, then
    spends its session doing CRUD on activities and folders."""

    wait_time = between(1, 3)

    def on_start(self):
        self.token = None
        self.headers = {}
        self.folder_ids = []

        idx = _next_user_id()
        self.username = f"perf_{_run_id}_{idx}"
        self.email = f"{self.username}@example.com"

        register_payload = {
            "first_name": "Perf",
            "last_name": "Tester",
            "username": self.username,
            "password": PASSWORD,
            "email": self.email,
        }

        with self.client.post(
            "/auth/register",
            json=register_payload,
            name="/auth/register [setup]",
            catch_response=True,
        ) as resp:
            if resp.status_code != 201:
                resp.failure(
                    f"register failed: {resp.status_code} body={resp.text[:200]}"
                )
                return

        login_payload = {"username": self.username, "password": PASSWORD}
        with self.client.post(
            "/auth/login",
            json=login_payload,
            name="/auth/login [setup]",
            catch_response=True,
        ) as resp:
            if resp.status_code != 200:
                resp.failure(
                    f"login failed: {resp.status_code} body={resp.text[:200]}"
                )
                return
            try:
                body = resp.json()
                self.token = body["access_token"]
            except Exception as exc:
                resp.failure(f"login body unparsable: {exc}")
                return

        self.headers = {"Authorization": f"Bearer {self.token}"}

    def _authed(self) -> bool:
        """Skip protected tasks when setup failed. Avoids cascading
        401s into the steady-state metrics."""
        return self.token is not None

    @tag("crud")
    @task(5)
    def fetch_activities(self):
        if not self._authed():
            return
        self.client.get(
            "/activities",
            headers=self.headers,
            name="/activities [GET]",
        )

    @tag("crud")
    @task(2)
    def create_activity(self):
        if not self._authed():
            return
        payload = {
            "title": f"perf-activity-{random.randint(0, 1_000_000)}",
            "duration_minutes": random.choice([15, 30, 60, 90]),
            "priority": random.randint(1, 5),
        }
        self.client.post(
            "/activities",
            json=payload,
            headers=self.headers,
            name="/activities [POST]",
        )

    @tag("crud")
    @task(1)
    def create_folder(self):
        if not self._authed():
            return
        # Folder (user_id, name) is unique; suffix to avoid 409 churn.
        name = f"perf-folder-{random.randint(0, 1_000_000)}"
        with self.client.post(
            "/folders",
            json={"name": name, "color": "sky"},
            headers=self.headers,
            name="/folders [POST]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 201:
                try:
                    self.folder_ids.append(resp.json()["id"])
                except Exception:
                    pass
            elif resp.status_code == 409:
                # Name collision is benign noise under load; mark as
                # success so it does not inflate the failure rate.
                resp.success()

    @tag("crud")
    @task(2)
    def fetch_folders(self):
        if not self._authed():
            return
        self.client.get(
            "/folders",
            headers=self.headers,
            name="/folders [GET]",
        )

    @tag("assistant")
    @task(1)
    def assistant_chat(self):
        if not self._authed():
            return
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": "Schedule gym on day 18 at 7:30 PM for 1 hour",
                }
            ],
            "active_year": 2026,
            "active_month": 5,
        }
        # Assistant requests are sequential through Ollama and can take
        # several seconds; do not let Locust's default success/failure
        # categorize a slow-but-valid 200 as failure.
        self.client.post(
            "/assistant/chat",
            json=payload,
            headers=self.headers,
            name="/assistant/chat [POST]",
        )
