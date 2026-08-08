def test_folders_list_without_auth_returns_401(client):
    response = client.get("/folders")
    assert response.status_code == 401


def test_create_folder_assigns_user_id_from_token(
    client, auth_header, login_token
):
    user, token = login_token("alice")
    response = client.post(
        "/folders",
        json={"name": "Work", "color": "sky"},
        headers=auth_header(token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user_id"] == user["id"]
    assert body["name"] == "Work"


def test_user_can_only_list_their_own_folders(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    client.post(
        "/folders",
        json={"name": "Alice work", "color": "sky"},
        headers=auth_header(alice_token),
    )

    bob_list = client.get("/folders", headers=auth_header(bob_token)).json()
    assert bob_list == []

    alice_list = client.get(
        "/folders", headers=auth_header(alice_token)
    ).json()
    assert len(alice_list) == 1
    assert alice_list[0]["name"] == "Alice work"


def test_update_folder_renames_and_recolors(client, auth_header, login_token):
    _user, token = login_token("alice")
    headers = auth_header(token)
    created = client.post(
        "/folders",
        json={"name": "Work", "color": "sky"},
        headers=headers,
    ).json()

    response = client.patch(
        f"/folders/{created['id']}",
        json={"name": "Renamed", "color": "rose"},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["name"] == "Renamed"
    assert body["color"] == "rose"


def test_update_folder_to_duplicate_name_returns_409(
    client, auth_header, login_token
):
    _user, token = login_token("alice")
    headers = auth_header(token)
    client.post(
        "/folders",
        json={"name": "Work", "color": "sky"},
        headers=headers,
    )
    other = client.post(
        "/folders",
        json={"name": "Home", "color": "rose"},
        headers=headers,
    ).json()

    response = client.patch(
        f"/folders/{other['id']}",
        json={"name": "Work"},
        headers=headers,
    )
    assert response.status_code == 409


def test_cross_user_folder_update_returns_404(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    created = client.post(
        "/folders",
        json={"name": "Alice work", "color": "sky"},
        headers=auth_header(alice_token),
    ).json()

    response = client.patch(
        f"/folders/{created['id']}",
        json={"name": "Hijacked"},
        headers=auth_header(bob_token),
    )
    assert response.status_code == 404


def test_cross_user_folder_delete_returns_404(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    created = client.post(
        "/folders",
        json={"name": "Alice work", "color": "sky"},
        headers=auth_header(alice_token),
    ).json()

    response = client.delete(
        f"/folders/{created['id']}", headers=auth_header(bob_token)
    )
    assert response.status_code == 404


def test_duplicate_folder_name_for_same_user_returns_409(
    client, auth_header, login_token
):
    _user, token = login_token("alice")
    first = client.post(
        "/folders",
        json={"name": "Work", "color": "sky"},
        headers=auth_header(token),
    )
    assert first.status_code == 201

    duplicate = client.post(
        "/folders",
        json={"name": "Work", "color": "rose"},
        headers=auth_header(token),
    )
    assert duplicate.status_code == 409


def test_same_folder_name_allowed_across_different_users(
    client, auth_header, login_token
):
    _alice, alice_token = login_token("alice")
    _bob, bob_token = login_token("bob")

    a = client.post(
        "/folders",
        json={"name": "Work", "color": "sky"},
        headers=auth_header(alice_token),
    )
    b = client.post(
        "/folders",
        json={"name": "Work", "color": "rose"},
        headers=auth_header(bob_token),
    )
    assert a.status_code == 201
    assert b.status_code == 201
