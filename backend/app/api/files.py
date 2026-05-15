from fastapi import APIRouter
from pathlib import Path


router = APIRouter()

# Root folder exposed by the /files endpoint.
BASE_DIR = Path("sandbox/workspace")

@router.get("/files")

async def list_files():

    # Build a recursive tree structure expected by the frontend sidebar.
    def build_tree(path: Path):

        tree = []

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