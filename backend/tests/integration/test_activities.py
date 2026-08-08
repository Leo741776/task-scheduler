def test_create_activity_assigns_user_id_from_token(
    client, auth_header, login_token
):
    user, token = login_token("alice")
    response = client.post(
        "/activities",
        json={"title": "Standup", "duration_minutes": 30, "priority": 3},
        headers=auth_header(token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user_id"] == user["id"]
    assert body["title"] == "Standup"


def test_create_activity_rejects_extra_user_id_field(
    client, auth_header, login_token
):
    _user, token = login_token("alice")
    response = client.post(
        "/activities",
        json={
            "title": "Standup",
            "duration_minutes": 30,
            "priority": 3,
            "user_id": 9999,
        },
        headers=auth_header(token),
    )
    assert response.status_code in (400, 422)


def test_user_can_only_list_their_own_activities(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    client.post(
        "/activities",
        json={"title": "Alice task", "duration_minutes": 30, "priority": 3},
        headers=auth_header(alice_token),
    )

    bob_list = client.get("/activities", headers=auth_header(bob_token)).json()
    assert bob_list == []

    alice_list = client.get(
        "/activities", headers=auth_header(alice_token)
    ).json()
    assert len(alice_list) == 1
    assert alice_list[0]["title"] == "Alice task"


def test_cross_user_activity_get_returns_404(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    created = client.post(
        "/activities",
        json={"title": "Alice task", "duration_minutes": 30, "priority": 3},
        headers=auth_header(alice_token),
    ).json()

    response = client.get(
        f"/activities/{created['id']}", headers=auth_header(bob_token)
    )
    assert response.status_code == 404


def test_cross_user_activity_update_returns_404(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    created = client.post(
        "/activities",
        json={"title": "Alice task", "duration_minutes": 30, "priority": 3},
        headers=auth_header(alice_token),
    ).json()

    response = client.patch(
        f"/activities/{created['id']}",
        json={"title": "Hijacked"},
        headers=auth_header(bob_token),
    )
    assert response.status_code == 404


def test_cross_user_activity_delete_returns_404(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    created = client.post(
        "/activities",
        json={"title": "Alice task", "duration_minutes": 30, "priority": 3},
        headers=auth_header(alice_token),
    ).json()

    response = client.delete(
        f"/activities/{created['id']}", headers=auth_header(bob_token)
    )
    assert response.status_code == 404

    still_there = client.get(
        f"/activities/{created['id']}", headers=auth_header(alice_token)
    )
    assert still_there.status_code == 200


def test_create_activity_with_other_users_folder_returns_404(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    bob_folder = client.post(
        "/folders",
        json={"name": "Bob private", "color": "sky"},
        headers=auth_header(bob_token),
    ).json()

    response = client.post(
        "/activities",
        json={
            "title": "Alice task",
            "duration_minutes": 30,
            "priority": 3,
            "folder_id": bob_folder["id"],
        },
        headers=auth_header(alice_token),
    )
    assert response.status_code == 404


def test_update_activity_to_other_users_folder_returns_404(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    bob_folder = client.post(
        "/folders",
        json={"name": "Bob private", "color": "sky"},
        headers=auth_header(bob_token),
    ).json()

    alice_task = client.post(
        "/activities",
        json={"title": "Alice task", "duration_minutes": 30, "priority": 3},
        headers=auth_header(alice_token),
    ).json()

    response = client.patch(
        f"/activities/{alice_task['id']}",
        json={"folder_id": bob_folder["id"]},
        headers=auth_header(alice_token),
    )
    assert response.status_code == 404


def test_create_activity_with_task_group_id_persists(
    client, auth_header, login_token
):
    _user, token = login_token("alice")
    response = client.post(
        "/activities",
        json={
            "title": "Recurring",
            "duration_minutes": 30,
            "priority": 3,
            "task_group_id": "group-abc",
        },
        headers=auth_header(token),
    )
    assert response.status_code == 201
    assert response.json()["task_group_id"] == "group-abc"


def test_delete_activity_group_removes_all_matching_activities(
    client, auth_header, login_token
):
    _user, token = login_token("alice")
    headers = auth_header(token)

    for i in range(3):
        client.post(
            "/activities",
            json={
                "title": f"recurring {i}",
                "duration_minutes": 30,
                "priority": 3,
                "task_group_id": "group-x",
            },
            headers=headers,
        )
    other = client.post(
        "/activities",
        json={
            "title": "in different group",
            "duration_minutes": 30,
            "priority": 3,
            "task_group_id": "group-y",
        },
        headers=headers,
    ).json()

    response = client.delete("/activities/groups/group-x", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"deleted": 3}

    remaining = client.get("/activities", headers=headers).json()
    assert len(remaining) == 1
    assert remaining[0]["id"] == other["id"]
    assert remaining[0]["task_group_id"] == "group-y"


def test_delete_activity_group_returns_404_when_group_does_not_exist(
    client, auth_header, login_token
):
    _user, token = login_token("alice")
    response = client.delete(
        "/activities/groups/group-does-not-exist",
        headers=auth_header(token),
    )
    assert response.status_code == 404


def test_delete_activity_group_does_not_touch_other_users_groups(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    for i in range(2):
        client.post(
            "/activities",
            json={
                "title": f"alice {i}",
                "duration_minutes": 30,
                "priority": 3,
                "task_group_id": "shared-group-id",
            },
            headers=auth_header(alice_token),
        )
    bob_task = client.post(
        "/activities",
        json={
            "title": "bob task",
            "duration_minutes": 30,
            "priority": 3,
            "task_group_id": "shared-group-id",
        },
        headers=auth_header(bob_token),
    ).json()

    response = client.delete(
        "/activities/groups/shared-group-id",
        headers=auth_header(alice_token),
    )
    assert response.status_code == 200
    assert response.json() == {"deleted": 2}

    bob_remaining = client.get(
        "/activities", headers=auth_header(bob_token)
    ).json()
    assert len(bob_remaining) == 1
    assert bob_remaining[0]["id"] == bob_task["id"]
