"""
FastAPI application entry point for the Supply Chain Control Tower.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from utils.errors import AppError
from utils.logger import api_logger

# Import route modules
from api.routes import inventory, supplier, shipment, demand, documents, query, health, alerts, sheets
from monitoring.monitor import monitor


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title="AI Supply Chain Control Tower",
        description=(
            "Enterprise-grade AI-powered supply chain decision support platform. "
            "Combines multi-agent workflows, RAG, and predictive analytics."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # --- CORS Middleware ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000", settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Include Routers ---
    app.include_router(health.router)
    app.include_router(inventory.router)
    app.include_router(supplier.router)
    app.include_router(shipment.router)
    app.include_router(demand.router)
    app.include_router(documents.router)
    app.include_router(query.router)
    app.include_router(alerts.router)
    app.include_router(sheets.router)

    # --- Global Exception Handler ---
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        api_logger.error(
            f"AppError: {exc.message}",
            extra={"error_code": exc.error_code, "details": exc.details}
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": exc.message,
                "error_code": exc.error_code,
                "details": exc.details,
            },
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        api_logger.error(f"Unhandled error: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "An internal server error occurred",
                "error_code": "INTERNAL_ERROR",
            },
        )

    # --- Startup Event ---
    @app.on_event("startup")
    async def startup():
        api_logger.info("Starting AI Supply Chain Control Tower...")

        # Ensure storage directories exist
        settings.ensure_directories()
        api_logger.info("Storage directories verified")

        # Log configuration (no secrets)
        api_logger.info(f"Groq model: {settings.groq_model}")
        api_logger.info(f"Embedding model: {settings.embedding_model}")
        
        # Start background monitoring loop
        await monitor.start()
        api_logger.info("System startup complete")

    @app.on_event("shutdown")
    async def shutdown():
        await monitor.stop()
        api_logger.info("Shutting down AI Supply Chain Control Tower...")

    return app


# Create the app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
