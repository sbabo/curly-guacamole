"""
This module defines the API endpoints related to file management in the workspace.
Author: Samuel Babot
Date : 2026-05-15
"""

from typing import Any
from fastapi import APIRouter
from pathlib import Path


router = APIRouter()

# Root folder exposed by the /files endpoint.
BASE_DIR = Path("sandbox/workspace")

@router.get("/files")

async def list_files() -> list[dict[str, Any]]:
    """Endpoint to list files in the workspace."""

    # Build a recursive tree structure expected by the frontend sidebar.
    def build_tree(path: Path) -> list[dict[str, Any]]:

        tree: list[dict[str, Any]] = []

        for item in path.iterdir():

            if item.is_dir():
                # Folders include nested children.
                tree.append({
                    "name": item.name,
                    "type": "folder",
                    "children": build_tree(item)
                })

            else:
                # Files are leaf nodes.
                tree.append({
                    "name": item.name,
                    "type": "file"
                })

        return tree

    # Return the full tree from the configured workspace root.
    return build_tree(BASE_DIR)
