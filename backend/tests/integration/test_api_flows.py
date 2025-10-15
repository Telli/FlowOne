"""Integration tests for flows API."""
import pytest


class TestFlowsAPI:
    """Test suite for /flows endpoints."""

    def test_create_flow(self, test_client):
        """Test POST /flows endpoint."""
        response = test_client.post(
            "/flows",
            json={"name": "Test Flow"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "flowId" in data
        assert "trace_id" in data
        assert len(data["flowId"]) > 0

    def test_list_flows(self, test_client):
        """Test GET /flows endpoint."""
        # Create a flow first
        create_response = test_client.post(
            "/flows",
            json={"name": "Test Flow"}
        )
        
        # List flows
        response = test_client.get("/flows")
        
        assert response.status_code == 200
        data = response.json()
        assert "flows" in data
        assert "trace_id" in data
        assert len(data["flows"]) > 0

    def test_get_flow(self, test_client):
        """Test GET /flows/:id endpoint."""
        # Create a flow
        create_response = test_client.post(
            "/flows",
            json={"name": "Test Flow"}
        )
        flow_id = create_response.json()["flowId"]
        
        # Get the flow
        response = test_client.get(f"/flows/{flow_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert "trace_id" in data

    def test_get_nonexistent_flow(self, test_client):
        """Test GET /flows/:id for non-existent flow."""
        response = test_client.get("/flows/nonexistent")
        
        assert response.status_code == 404

    def test_update_flow_graph(self, test_client):
        """Test PUT /flows/:id endpoint."""
        # Create a flow
        create_response = test_client.post(
            "/flows",
            json={"name": "Test Flow"}
        )
        flow_id = create_response.json()["flowId"]
        
        # Update with nodes and edges
        nodes = [
            {
                "id": "node1",
                "label": "Node 1",
                "position": {"x": 0, "y": 0},
                "data": {"type": "agent"}
            },
            {
                "id": "node2",
                "label": "Node 2",
                "position": {"x": 100, "y": 100},
                "data": {"type": "agent"}
            }
        ]
        edges = [
            {
                "id": "edge1",
                "source": "node1",
                "target": "node2",
                "data": {}
            }
        ]
        
        response = test_client.put(
            f"/flows/{flow_id}",
            json={"nodes": nodes, "edges": edges}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "trace_id" in data
        
        # Verify the graph was saved
        get_response = test_client.get(f"/flows/{flow_id}")
        graph = get_response.json()
        assert len(graph["nodes"]) == 2
        assert len(graph["edges"]) == 1

    def test_create_flow_version(self, test_client):
        """Test POST /flows/:id/version endpoint."""
        # Create a flow and add some content
        create_response = test_client.post(
            "/flows",
            json={"name": "Test Flow"}
        )
        flow_id = create_response.json()["flowId"]
        
        # Add graph
        nodes = [{"id": "n1", "position": {"x": 0, "y": 0}, "data": {}}]
        edges = []
        test_client.put(
            f"/flows/{flow_id}",
            json={"nodes": nodes, "edges": edges}
        )
        
        # Create version
        response = test_client.post(
            f"/flows/{flow_id}/version",
            json={"nodes": nodes, "edges": edges}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "trace_id" in data
        assert data["version"] == 1

    def test_list_flow_versions(self, test_client):
        """Test GET /flows/:id/versions endpoint."""
        # Create flow and version
        create_response = test_client.post(
            "/flows",
            json={"name": "Test Flow"}
        )
        flow_id = create_response.json()["flowId"]
        
        # Create a version
        nodes = [{"id": "n1", "position": {"x": 0, "y": 0}, "data": {}}]
        test_client.post(
            f"/flows/{flow_id}/version",
            json={"nodes": nodes, "edges": []}
        )
        
        # List versions
        response = test_client.get(f"/flows/{flow_id}/versions")
        
        assert response.status_code == 200
        data = response.json()
        assert "versions" in data
        assert "trace_id" in data
        assert len(data["versions"]) > 0

    def test_get_flow_version(self, test_client):
        """Test GET /flows/:id/versions/:version endpoint."""
        # Create flow and version
        create_response = test_client.post(
            "/flows",
            json={"name": "Test Flow"}
        )
        flow_id = create_response.json()["flowId"]
        
        nodes = [{"id": "n1", "label": "Test", "position": {"x": 0, "y": 0}, "data": {}}]
        version_response = test_client.post(
            f"/flows/{flow_id}/version",
            json={"nodes": nodes, "edges": []}
        )
        version = version_response.json()["version"]
        
        # Get specific version
        response = test_client.get(f"/flows/{flow_id}/versions/{version}")
        
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert "trace_id" in data

    def test_multiple_versions(self, test_client):
        """Test creating multiple versions increments version number."""
        # Create flow
        create_response = test_client.post(
            "/flows",
            json={"name": "Test Flow"}
        )
        flow_id = create_response.json()["flowId"]
        
        # Create first version
        v1_response = test_client.post(
            f"/flows/{flow_id}/version",
            json={"nodes": [], "edges": []}
        )
        assert v1_response.json()["version"] == 1
        
        # Create second version
        v2_response = test_client.post(
            f"/flows/{flow_id}/version",
            json={"nodes": [], "edges": []}
        )
        assert v2_response.json()["version"] == 2

