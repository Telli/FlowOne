# FlowOne Backend Tests

Comprehensive test suite for the FlowOne backend API.

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures and configuration
├── unit/                    # Unit tests (isolated components)
│   ├── test_gemini_flash.py    # Gemini Flash service tests
│   ├── test_store.py           # Database operations tests
│   ├── test_pipecat_runtime.py # Session management tests
│   └── test_langfuse.py        # Observability tests
└── integration/             # Integration tests (API endpoints)
    ├── test_api_agents.py      # /agents endpoints
    ├── test_api_sessions.py    # /sessions endpoints
    ├── test_api_flows.py       # /flows endpoints
    ├── test_api_templates.py   # /templates endpoints
    ├── test_api_nlp.py         # /nlp/commands endpoint
    ├── test_api_voice.py       # /voice endpoints
    └── test_api_health.py      # /health endpoints
```

## Running Tests

### Prerequisites

```bash
# Install dependencies
pip install -r requirements.txt
```

### Run All Tests

```bash
# From backend directory
pytest

# With verbose output
pytest -v

# With coverage report
pytest --cov=backend --cov-report=term-missing
```

### Run Specific Test Categories

```bash
# Unit tests only
pytest tests/unit/

# Integration tests only
pytest tests/integration/

# Specific test file
pytest tests/unit/test_gemini_flash.py

# Specific test class
pytest tests/integration/test_api_agents.py::TestAgentsAPI

# Specific test method
pytest tests/integration/test_api_agents.py::TestAgentsAPI::test_create_agent
```

### Coverage Reports

```bash
# Generate HTML coverage report
pytest --cov=backend --cov-report=html

# View report (opens in browser)
open htmlcov/index.html  # macOS
start htmlcov/index.html # Windows
```

## Test Fixtures

### Available Fixtures (defined in conftest.py)

- **test_db_engine**: In-memory SQLite database for testing
- **test_session**: Database session scoped to a test
- **mock_settings**: Mocked application settings
- **test_client**: FastAPI TestClient with mocked dependencies
- **mock_gemini_api**: Mocked Gemini API responses (respx)
- **mock_daily_api**: Mocked Daily.co API responses (respx)

### Using Fixtures

```python
def test_something(test_client, mock_gemini_api):
    """Test uses both test_client and mocked Gemini API."""
    response = test_client.post("/agents", json={...})
    assert response.status_code == 200
```

## Writing New Tests

### Unit Test Example

```python
# tests/unit/test_my_service.py
from backend.services.my_service import my_function

class TestMyService:
    def test_my_function(self):
        """Test my function with specific input."""
        result = my_function("input")
        assert result == "expected_output"
```

### Integration Test Example

```python
# tests/integration/test_api_my_endpoint.py
class TestMyEndpoint:
    def test_my_endpoint(self, test_client):
        """Test my API endpoint."""
        response = test_client.get("/my-endpoint")
        assert response.status_code == 200
        assert "key" in response.json()
```

### Async Test Example

```python
import pytest

class TestAsyncOperation:
    @pytest.mark.asyncio
    async def test_async_operation(self):
        """Test async operation."""
        result = await some_async_function()
        assert result is not None
```

## Mocking External APIs

### Gemini API

The `mock_gemini_api` fixture automatically mocks all Gemini API calls:

```python
def test_with_gemini(test_client, mock_gemini_api):
    # All Gemini API calls will be mocked
    response = test_client.post("/agents", json={...})
    # No actual API calls made
```

### Daily.co API

The `mock_daily_api` fixture mocks Daily.co endpoints:

```python
def test_with_daily(test_client, mock_daily_api):
    # Daily API calls will be mocked
    response = test_client.get("/voice/tokens?sessionId=test")
    # Returns mocked token
```

### Custom Mocking

```python
import respx
from httpx import Response

def test_custom_mock():
    with respx.mock:
        respx.get("https://example.com/api").mock(
            return_value=Response(200, json={"data": "value"})
        )
        # Your test code here
```

## CI/CD Integration

Tests are designed to run in CI environments:

```yaml
# .github/workflows/test.yml example
- name: Run Backend Tests
  run: |
    cd backend
    pytest --cov=backend --cov-report=xml
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./backend/coverage.xml
```

## Troubleshooting

### Tests Failing Locally

1. **Database errors**: Ensure SQLite is available
2. **Import errors**: Check Python path and installed packages
3. **Async errors**: Ensure `pytest-asyncio` is installed

### Slow Tests

```bash
# Show slowest 10 tests
pytest --durations=10

# Run tests in parallel (if pytest-xdist installed)
pytest -n auto
```

### Debugging Tests

```bash
# Drop into debugger on failure
pytest --pdb

# Show print statements
pytest -s

# Show local variables on failure
pytest -l
```

## Coverage Goals

- **Overall Backend**: ≥80% coverage
- **API Endpoints**: ≥90% coverage
- **Services**: ≥80% coverage
- **Data Layer**: ≥85% coverage

Check current coverage:
```bash
pytest --cov=backend --cov-report=term-missing
```

## Best Practices

1. **Isolate tests**: Each test should be independent
2. **Use fixtures**: Avoid duplicate setup code
3. **Test edge cases**: Not just happy paths
4. **Clear names**: Test names should describe what they test
5. **Mock external calls**: Don't hit real APIs in tests
6. **Check assertions**: Every test should have at least one assertion
7. **Test error cases**: Test both success and failure scenarios

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [FastAPI testing guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [respx documentation](https://lundberg.github.io/respx/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)

