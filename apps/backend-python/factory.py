"""Generators for structural model templates."""

from typing import List

from models import Member, Node, StructuralModel, SupportType


class StructuralFactory:
    """Generate structural models for common templates."""

    @staticmethod
    def generate_continuous_beam(spans: List[float], section_profile: str = "ISMB300") -> StructuralModel:
        """Create a continuous beam with pinned supports at each span end and 10 intermediate nodes per span."""

        if not spans:
            raise ValueError("spans list cannot be empty")

        nodes: List[Node] = []
        members: List[Member] = []

        current_x = 0.0
        node_index = 0

        for span_idx, span in enumerate(spans):
            # Start node for the span
            if node_index == 0:
                nodes.append(
                    Node(
                        id=f"N{node_index}",
                        x=current_x,
                        y=0.0,
                        z=0.0,
                        support=SupportType.PINNED,
                    )
                )
                node_index += 1

            step = span / 11.0  # 10 intermediate nodes => 11 segments

            # Intermediate nodes
            for j in range(1, 11):
                nodes.append(
                    Node(
                        id=f"N{node_index}",
                        x=current_x + step * j,
                        y=0.0,
                        z=0.0,
                        support=SupportType.NONE,
                    )
                )
                node_index += 1

            # End node for this span
            current_x += span
            is_last_span = span_idx == len(spans) - 1
            nodes.append(
                Node(
                    id=f"N{node_index}",
                    x=current_x,
                    y=0.0,
                    z=0.0,
                    support=SupportType.PINNED if is_last_span else SupportType.NONE,
                )
            )
            node_index += 1

        # Members between consecutive nodes
        for i in range(len(nodes) - 1):
            members.append(
                Member(
                    id=f"M{i}",
                    start_node=nodes[i].id,
                    end_node=nodes[i + 1].id,
                    section_profile=section_profile,
                )
            )

        metadata = {
            "template": "continuous_beam",
            "spans": ",".join(str(s) for s in spans),
            "section_profile": section_profile,
        }

        return StructuralModel(nodes=nodes, members=members, metadata=metadata)

    @staticmethod
    def generate_pratt_truss(span: float, height: float, bays: int, section_profile: str = "ISMB300") -> StructuralModel:
        """Create a planar Pratt truss with bottom/top chords, verticals, and alternating diagonals."""

        if bays < 1:
            raise ValueError("bays must be >= 1")

        bay_width = span / bays
        nodes: List[Node] = []
        members: List[Member] = []

        # Nodes
        for i in range(bays + 1):
            x = bay_width * i
            nodes.append(
                Node(
                    id=f"B{i}",
                    x=x,
                    y=0.0,
                    z=0.0,
                    support=SupportType.PINNED if i in (0, bays) else SupportType.NONE,
                )
            )
            nodes.append(
                Node(
                    id=f"T{i}",
                    x=x,
                    y=height,
                    z=0.0,
                    support=SupportType.NONE,
                )
            )

        # Bottom chord
        for i in range(bays):
            members.append(
                Member(id=f"BC{i}", start_node=f"B{i}", end_node=f"B{i+1}", section_profile=section_profile)
            )

        # Top chord
        for i in range(bays):
            members.append(
                Member(id=f"TC{i}", start_node=f"T{i}", end_node=f"T{i+1}", section_profile=section_profile)
            )

        # Verticals
        for i in range(bays + 1):
            members.append(
                Member(id=f"V{i}", start_node=f"B{i}", end_node=f"T{i}", section_profile=section_profile)
            )

        # Diagonals (Pratt pattern)
        for i in range(bays):
            if i % 2 == 0:
                members.append(
                    Member(id=f"D{i}", start_node=f"B{i}", end_node=f"T{i+1}", section_profile=section_profile)
                )
            else:
                members.append(
                    Member(id=f"D{i}", start_node=f"B{i+1}", end_node=f"T{i}", section_profile=section_profile)
                )

        metadata = {
            "template": "pratt_truss",
            "span": str(span),
            "height": str(height),
            "bays": str(bays),
            "section_profile": section_profile,
        }

        return StructuralModel(nodes=nodes, members=members, metadata=metadata)

    @staticmethod
    def generate_3d_frame(
        width: float,
        length: float,
        height: float,
        stories: int,
        section_profile: str = "ISMB300",
    ) -> StructuralModel:
        """Create a simple 3D frame grid with fixed supports at base nodes (y=0)."""

        if stories < 1:
            raise ValueError("stories must be >= 1")

        nodes: List[Node] = []
        members: List[Member] = []

        level_height = height / stories

        x_positions = [0.0, width]
        z_positions = [0.0, length]

        # Node creation
        for level in range(stories + 1):
            y = level * level_height
            for x in x_positions:
                for z in z_positions:
                    support = SupportType.FIXED if level == 0 else SupportType.NONE
                    nodes.append(Node(id=f"N_{level}_{x}_{z}", x=x, y=y, z=z, support=support))

        # Helper to find node ids
        def node_id(level: int, x_idx: int, z_idx: int) -> str:
            return f"N_{level}_{x_positions[x_idx]}_{z_positions[z_idx]}"

        # Columns (vertical)
        for level in range(stories):
            for xi in range(len(x_positions)):
                for zi in range(len(z_positions)):
                    members.append(
                        Member(
                            id=f"C_{level}_{xi}_{zi}",
                            start_node=node_id(level, xi, zi),
                            end_node=node_id(level + 1, xi, zi),
                            section_profile=section_profile,
                        )
                    )

        # Beams along X at each level
        for level in range(1, stories + 1):
            for zi in range(len(z_positions)):
                members.append(
                    Member(
                        id=f"BX_{level}_{zi}",
                        start_node=node_id(level, 0, zi),
                        end_node=node_id(level, 1, zi),
                        section_profile=section_profile,
                    )
                )

        # Beams along Z at each level
        for level in range(1, stories + 1):
            for xi in range(len(x_positions)):
                members.append(
                    Member(
                        id=f"BZ_{level}_{xi}",
                        start_node=node_id(level, xi, 0),
                        end_node=node_id(level, xi, 1),
                        section_profile=section_profile,
                    )
                )

        metadata = {
            "template": "3d_frame",
            "width": str(width),
            "length": str(length),
            "height": str(height),
            "stories": str(stories),
            "section_profile": section_profile,
        }

        return StructuralModel(nodes=nodes, members=members, metadata=metadata)
