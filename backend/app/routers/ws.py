from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.dependencies import get_ws_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/etl")
async def etl_websocket(ws: WebSocket) -> None:
    manager = ws.app.state.ws_manager
    await manager.connect(ws)
    try:
        while True:
            # Keep connection alive; client can send pings
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
