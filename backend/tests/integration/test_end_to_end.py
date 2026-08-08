def test_end_to_end_register_login_folder_activity_happy_path(client):
    register_payload = {
        "first_name": "Eve",
        "last_name": "Tester",
        "username": "eve_e2e",
        "password": "password123",
        "email": "eve_e2e@example.com",
    }
    register_response = client.post("/auth/register", json=register_payload)
    assert register_response.status_code == 201, register_response.text
    user = register_response.json()
    assert user["username"] == "eve_e2e"
    assert user["email"] == "eve_e2e@example.com"
    user_id = user["id"]

    login_response = client.post(
        "/auth/login",
        json={"username": "eve_e2e", "password": "password123"},
    )
    assert login_response.status_code == 200, login_response.text
    login_body = login_response.json()
    assert login_body["token_type"] == "bearer"
    assert login_body["user"]["id"] == user_id
    token = login_body["access_token"]
    assert isinstance(token, str) and token
    auth = {"Authorization": f"Bearer {token}"}

    folder_response = client.post(
        "/folders",
        json={"name": "Workouts", "color": "sky"},
        headers=auth,
    )
    assert folder_response.status_code == 201, folder_response.text
    folder = folder_response.json()
    assert folder["name"] == "Workouts"
    assert folder["user_id"] == user_id
    folder_id = folder["id"]

    activity_response = client.post(
        "/activities",
        json={
            "title": "Morning gym",
            "description": "Cardio and lift",
            "duration_minutes": 60,
            "priority": 4,
            "folder_id": folder_id,
        },
        headers=auth,
    )
    assert activity_response.status_code == 201, activity_response.text
    activity = activity_response.json()
    assert activity["title"] == "Morning gym"
    assert activity["description"] == "Cardio and lift"
    assert activity["duration_minutes"] == 60
    assert activity["priority"] == 4
    assert activity["folder_id"] == folder_id
    assert activity["user_id"] == user_id

    list_response = client.get("/activities", headers=auth)
    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed) == 1
    assert listed[0]["id"] == activity["id"]
    assert listed[0]["folder_id"] == folder_id
