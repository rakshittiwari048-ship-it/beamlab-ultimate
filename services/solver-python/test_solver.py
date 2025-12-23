#!/usr/bin/env python3
"""
Test script for the structural solver.

Usage:
    python test_solver.py
"""

import json
import subprocess
import sys
import time
from pathlib import Path


def run_test(input_file: str, description: str) -> bool:
    """Run solver on input file and validate output."""
    print(f"\n{'='*60}")
    print(f"Test: {description}")
    print(f"Input: {input_file}")
    print('='*60)
    
    start = time.perf_counter()
    
    try:
        result = subprocess.run(
            ['python3', 'solver.py', input_file],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        elapsed = time.perf_counter() - start
        
        if result.returncode != 0:
            print(f"❌ FAILED: Process exited with code {result.returncode}")
            print(f"stderr: {result.stderr}")
            return False
        
        # Parse output lines
        output_lines = result.stdout.strip().split('\n')
        
        # Find result line
        result_data = None
        for line in output_lines:
            try:
                msg = json.loads(line)
                if msg.get('type') == 'result':
                    result_data = msg['data']
                elif msg.get('type') == 'progress':
                    print(f"  [{msg['data']['stage']}] {msg['data']['progress']}% - {msg['data']['message']}")
            except json.JSONDecodeError:
                pass
        
        if not result_data:
            print(f"❌ FAILED: No result found in output")
            print(f"stdout: {result.stdout}")
            return False
        
        if not result_data.get('success'):
            print(f"❌ FAILED: Solver reported failure")
            print(f"Error: {result_data.get('error')}")
            return False
        
        # Validate result
        displacements = result_data.get('displacements', [])
        timing = result_data.get('timing', {})
        solver_info = result_data.get('solverInfo', {})
        matrix_stats = result_data.get('matrixStats', {})
        
        print(f"\n✅ SUCCESS")
        print(f"\nResults:")
        print(f"  DOFs: {len(displacements)}")
        print(f"  Max displacement: {max(abs(d) for d in displacements):.6e}")
        print(f"\nTiming:")
        print(f"  Assembly: {timing.get('assembly', 0):.1f} ms")
        print(f"  Solve: {timing.get('solve', 0):.1f} ms")
        print(f"  Total: {timing.get('total', 0):.1f} ms")
        print(f"\nSolver Info:")
        print(f"  Method: {solver_info.get('method', 'unknown')}")
        print(f"\nMatrix Stats:")
        print(f"  Size: {matrix_stats.get('size', 0)}")
        print(f"  Non-zeros: {matrix_stats.get('nnz', 0)}")
        print(f"  Density: {matrix_stats.get('density', 0)*100:.2f}%")
        print(f"  Memory saved: {matrix_stats.get('memorySavedMB', 0):.2f} MB")
        
        print(f"\nTotal test time: {elapsed:.2f}s")
        
        return True
        
    except subprocess.TimeoutExpired:
        print(f"❌ FAILED: Timeout after 60 seconds")
        return False
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def generate_large_model(num_nodes: int) -> dict:
    """Generate a large model for stress testing."""
    nodes = []
    members = []
    supports = []
    loads = []
    
    # Create a linear beam with num_nodes nodes
    for i in range(num_nodes):
        nodes.append({
            'id': f'n{i}',
            'x': i * 2.0,
            'y': 0.0,
            'z': 0.0
        })
    
    # Connect nodes with members
    for i in range(num_nodes - 1):
        members.append({
            'id': f'm{i}',
            'startNodeId': f'n{i}',
            'endNodeId': f'n{i+1}',
            'E': 200e9,
            'A': 0.01,
            'Iy': 1e-4,
            'Iz': 1e-4,
            'G': 80e9,
            'J': 1.5e-4
        })
    
    # Fix first node
    supports.append({
        'nodeId': 'n0',
        'dx': True, 'dy': True, 'dz': True,
        'rx': True, 'ry': True, 'rz': True
    })
    
    # Apply load at middle node
    mid = num_nodes // 2
    loads.append({
        'nodeId': f'n{mid}',
        'fy': -10000
    })
    
    return {
        'nodes': nodes,
        'members': members,
        'supports': supports,
        'loads': loads
    }


def run_stress_test(num_nodes: int) -> bool:
    """Run stress test with generated model."""
    print(f"\n{'='*60}")
    print(f"Stress Test: {num_nodes} nodes ({num_nodes * 6} DOFs)")
    print('='*60)
    
    # Generate model
    model = generate_large_model(num_nodes)
    
    # Write to temp file
    temp_file = f'/tmp/beamlab_stress_test_{num_nodes}.json'
    with open(temp_file, 'w') as f:
        json.dump(model, f)
    
    # Run test
    return run_test(temp_file, f'{num_nodes} nodes stress test')


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("BeamLab Python Solver Tests")
    print("="*60)
    
    # Check if solver.py exists
    if not Path('solver.py').exists():
        print("Error: solver.py not found. Run from solver-python directory.")
        sys.exit(1)
    
    # Run tests
    results = []
    
    # Test 1: Basic test
    results.append(run_test('test_input.json', 'Basic 3-node beam'))
    
    # Test 2: Small stress test
    results.append(run_stress_test(100))
    
    # Test 3: Medium stress test
    results.append(run_stress_test(500))
    
    # Test 4: Large stress test (threshold for cloud)
    results.append(run_stress_test(2000))
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"\nPassed: {passed}/{total}")
    
    if passed == total:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)


if __name__ == '__main__':
    main()
