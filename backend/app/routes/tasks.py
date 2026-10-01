from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user_id
from app.db import get_supabase

router = APIRouter(prefix="/tasks", tags=["tasks"])

TaskStatus = Literal["open", "done"]


class TaskCreate(BaseModel):
    title: str
    notes: str | None = None
    due_date: date | None = None
    priority: int = 2


class TaskUpdate(BaseModel):
    title: str | None = None
    notes: str | None = None
    due_date: date | None = None
    priority: int | None = None
    status: TaskStatus | None = None


class TaskOut(BaseModel):
    id: str
    user_id: str
    title: str
    notes: str | None
    due_date: date | None
    priority: int
    status: str
    source: str
    created_at: datetime
    completed_at: datetime | None


@router.get("", response_model=list[TaskOut])
def list_tasks(
    status: TaskStatus | None = None,
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    query = get_supabase().table("tasks").select("*").eq("user_id", user_id)
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.post("", response_model=TaskOut, status_code=201)
def create_task(task: TaskCreate, user_id: str = Depends(get_current_user_id)) -> dict:
    row = task.model_dump(mode="json")
    row["user_id"] = user_id
    row["source"] = "user"
    result = get_supabase().table("tasks").insert(row).execute()
    return result.data[0]


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: str, task: TaskUpdate, user_id: str = Depends(get_current_user_id)
) -> dict:
    updates = task.model_dump(mode="json", exclude_unset=True)
    if "status" in updates:
        updates["completed_at"] = (
            datetime.now(timezone.utc).isoformat() if updates["status"] == "done" else None
        )

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        get_supabase()
        .table("tasks")
        .update(updates)
        .eq("id", task_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return result.data[0]


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, user_id: str = Depends(get_current_user_id)) -> None:
    result = (
        get_supabase()
        .table("tasks")
        .delete()
        .eq("id", task_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
