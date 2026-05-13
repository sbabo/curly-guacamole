from fastapi import APIRouter
from pathlib import Path


router = APIRouter()

BASE_DIR = Path("sandbox/workspace")

@router.get("/files")

async def list_files():

    def build_tree(path: Path):

        tree = []

        for item in path.iterdir():

            if item.is_dir():
                tree.append({
                    "name": item.name,
                    "type": "folder",
                    "children": build_tree(item)
                })

            else:
                tree.append({
                    "name": item.name,
                    "type": "file"
                })

        return tree

    return build_tree(BASE_DIR)