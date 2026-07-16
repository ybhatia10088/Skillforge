from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlmodel import Session as DbSession

from app.api.sessions import EventsBatchIn, get_session_or_404, ingest_batch
from app.db.session import engine

router = APIRouter()


@router.websocket("/ws/sessions/{session_id}")
async def session_event_stream(websocket: WebSocket, session_id: UUID):
    await websocket.accept()
    try:
        with DbSession(engine) as db:
            get_session_or_404(db, session_id)
    except Exception:
        await websocket.close(code=4404)
        return

    try:
        while True:
            raw = await websocket.receive_json()
            try:
                batch = EventsBatchIn(**raw)
            except ValidationError:
                await websocket.send_json({"ok": False, "error": "invalid event batch"})
                continue
            with DbSession(engine) as db:
                ingest_batch(db, session_id, batch)
            await websocket.send_json({"ok": True})
    except WebSocketDisconnect:
        return
