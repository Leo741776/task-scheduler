def test_register_duplicate_username_returns_400_user_already_exists(client):
    first_payload = {
        "first_name": "Alice",
        "last_name": "Smith",
        "username": "alice_dup",
        "password": "password123",
        "email": "alice_dup@example.com",
    }
    first = client.post("/auth/register", json=first_payload)
    assert first.status_code == 201, first.text

    second_payload = dict(first_payload)
    second_payload["email"] = "alice_dup_alt@example.com"
    second = client.post("/auth/register", json=second_payload)
    assert second.status_code == 400
    assert "user already exists" in second.json()["detail"].lower()


def test_register_duplicate_email_returns_400_user_already_exists(client):
    first_payload = {
        "first_name": "Alice",
        "last_name": "Smith",
        "username": "alice_eml",
        "password": "password123",
        "email": "shared@example.com",
    }
    second_payload = {
        "first_name": "Bob",
        "last_name": "Jones",
        "username": "bob_eml",
        "password": "password123",
        "email": "shared@example.com",
    }
    first = client.post("/auth/register", json=first_payload)
    assert first.status_code == 201, first.text

    second = client.post("/auth/register", json=second_payload)
    assert second.status_code == 400
    assert "user already exists" in second.json()["detail"].lower()


def test_delete_folder_sets_associated_activity_folder_id_to_null(
    client, login_token, auth_header
):
    _user, token = login_token("eve_cascade")
    headers = auth_header(token)

    folder = client.post(
        "/folders",
        json={"name": "Workouts", "color": "sky"},
        headers=headers,
    ).json()

    activity = client.post(
        "/activities",
        json={
            "title": "Gym",
            "duration_minutes": 60,
            "priority": 3,
            "folder_id": folder["id"],
        },
        headers=headers,
    ).json()
    assert activity["folder_id"] == folder["id"]

    delete_response = client.delete(
        f"/folders/{folder['id']}", headers=headers
    )
    assert delete_response.status_code == 204

    listed = client.get("/activities", headers=headers).json()
    assert len(listed) == 1
    assert listed[0]["id"] == activity["id"]
    assert listed[0].get("folder_id") is None
