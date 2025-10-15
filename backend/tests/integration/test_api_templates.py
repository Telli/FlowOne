"""Integration tests for templates API."""
import pytest


class TestTemplatesAPI:
    """Test suite for /templates endpoints."""

    def test_list_templates(self, test_client):
        """Test GET /templates endpoint."""
        response = test_client.get("/templates")
        
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert "trace_id" in data
        # Should have default seeded templates
        assert len(data["templates"]) > 0

    def test_create_template(self, test_client):
        """Test POST /templates endpoint."""
        response = test_client.post(
            "/templates",
            json={
                "key": "custom_template",
                "name": "Custom Template",
                "description": "A custom template for testing",
                "color": "#FF5733",
                "config": {"persona": "test"}
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "trace_id" in data
        
        # Verify template was created
        list_response = test_client.get("/templates")
        templates = list_response.json()["templates"]
        custom = next((t for t in templates if t["key"] == "custom_template"), None)
        assert custom is not None
        assert custom["name"] == "Custom Template"

    def test_update_template(self, test_client):
        """Test PUT /templates/:id endpoint."""
        # Create a template
        create_response = test_client.post(
            "/templates",
            json={
                "key": "test_template",
                "name": "Test Template",
                "config": {}
            }
        )
        template_id = create_response.json()["id"]
        
        # Update it
        response = test_client.put(
            f"/templates/{template_id}",
            json={
                "key": "test_template",
                "name": "Updated Template",
                "description": "Updated description",
                "config": {"updated": True}
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == template_id
        assert "trace_id" in data
        
        # Verify update
        list_response = test_client.get("/templates")
        templates = list_response.json()["templates"]
        updated = next((t for t in templates if t["id"] == template_id), None)
        assert updated is not None
        assert updated["name"] == "Updated Template"

    def test_update_nonexistent_template(self, test_client):
        """Test PUT /templates/:id for non-existent template."""
        response = test_client.put(
            "/templates/nonexistent",
            json={
                "key": "test",
                "name": "Test"
            }
        )
        
        assert response.status_code == 404

    def test_delete_template(self, test_client):
        """Test DELETE /templates/:id endpoint."""
        # Create a template
        create_response = test_client.post(
            "/templates",
            json={
                "key": "deletable",
                "name": "Deletable Template",
                "config": {}
            }
        )
        template_id = create_response.json()["id"]
        
        # Delete it
        response = test_client.delete(f"/templates/{template_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "trace_id" in data
        
        # Verify deletion
        list_response = test_client.get("/templates")
        templates = list_response.json()["templates"]
        deleted = next((t for t in templates if t["id"] == template_id), None)
        assert deleted is None

    def test_delete_nonexistent_template(self, test_client):
        """Test DELETE /templates/:id for non-existent template."""
        response = test_client.delete("/templates/nonexistent")
        
        assert response.status_code == 404

    def test_default_templates_seeded(self, test_client):
        """Test that default templates are seeded on startup."""
        response = test_client.get("/templates")
        
        assert response.status_code == 200
        templates = response.json()["templates"]
        
        # Check for expected default templates
        template_keys = [t["key"] for t in templates]
        assert "sales" in template_keys
        assert "tutor" in template_keys
        assert "support" in template_keys
        assert "coach" in template_keys

