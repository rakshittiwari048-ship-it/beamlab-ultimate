"""Pydantic data schemas for the structural templates service."""

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel


class SupportType(str, Enum):
    PINNED = "PINNED"
    FIXED = "FIXED"
    ROLLER = "ROLLER"
    NONE = "NONE"


class Node(BaseModel):
    id: str
    x: float
    y: float
    z: float
    support: Optional[SupportType] = SupportType.NONE


class Member(BaseModel):
    id: str
    start_node: str
    end_node: str
    section_profile: str


class StructuralModel(BaseModel):
    nodes: List[Node]
    members: List[Member]
    metadata: Dict[str, str]
