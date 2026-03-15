#!/usr/bin/env python3
"""
ZGoogies Application Starter
Starts both frontend and backend servers
"""
import subprocess
import platform
import sys
import os
import time


def is_port_in_use(port):
    """Check if a port is already in use"""
    system = platform.system()

    try:
        if system == "Windows":
            result = subprocess.run(
                ['netstat', '-ano'],
                capture_output=True,
                text=True,
                check=True
            )
            # Check if port and LISTENING are on the same line
            for line in result.stdout.split('\n'):
                if f':{port}' in line and 'LISTENING' in line:
                    return True
            return False
        else:
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'],
                capture_output=True,
                text=True
            )
            return bool(result.stdout.strip())
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def start_backend():
    """Start the backend server"""
    print("\nStarting Backend (Flask)...")

    # Check if already running
    if is_port_in_use(5000):
        print("[WARNING] Backend already running on port 5000")
        return None

    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')

    if not os.path.exists(backend_dir):
        print("[ERROR] Backend directory not found")
        return None

    # Determine Python command
    system = platform.system()
    if system == "Windows":
        python_cmd = os.path.join(backend_dir, 'venv', 'Scripts', 'python.exe')
        if not os.path.exists(python_cmd):
            python_cmd = 'python'
    else:
        python_cmd = os.path.join(backend_dir, 'venv', 'bin', 'python')
        if not os.path.exists(python_cmd):
            python_cmd = 'python3'

    # Start backend
    try:
        run_script = os.path.join(backend_dir, 'run.py')
        process = subprocess.Popen(
            [python_cmd, run_script],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_CONSOLE if system == "Windows" else 0
        )

        # Wait a moment to check if it started
        time.sleep(2)
        if process.poll() is None:
            print("[OK] Backend started on http://localhost:5000")
            return process
        else:
            print("[ERROR] Backend failed to start")
            return None

    except Exception as e:
        print(f"[ERROR] Failed to start backend: {e}")
        return None


def find_npm():
    """Find npm executable"""
    system = platform.system()

    if system == "Windows":
        # Common npm locations on Windows
        possible_paths = [
            r"C:\Program Files\nodejs\npm.cmd",
            r"C:\Program Files (x86)\nodejs\npm.cmd",
            os.path.expanduser(r"~\AppData\Roaming\npm\npm.cmd"),
        ]

        # Check if npm is in PATH
        try:
            result = subprocess.run(['where', 'npm'], capture_output=True, text=True, check=True)
            if result.stdout.strip():
                return result.stdout.strip().split('\n')[0]
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass

        # Check common paths
        for path in possible_paths:
            if os.path.exists(path):
                return path

        return 'npm'  # Fallback to hoping it's in PATH
    else:
        return 'npm'


def start_frontend():
    """Start the frontend server"""
    print("\nStarting Frontend (Vite)...")

    # Check if already running
    if is_port_in_use(5173):
        print("[WARNING] Frontend already running on port 5173")
        return None

    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')

    if not os.path.exists(frontend_dir):
        print("[ERROR] Frontend directory not found")
        return None

    # Check if node_modules exists
    node_modules = os.path.join(frontend_dir, 'node_modules')
    if not os.path.exists(node_modules):
        print("[WARNING] node_modules not found. Run 'npm install' first")
        return None

    # Find npm executable
    npm_cmd = find_npm()

    # Start frontend
    try:
        system = platform.system()
        process = subprocess.Popen(
            [npm_cmd, 'run', 'dev'],
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=(system == "Windows"),  # Use shell on Windows for .cmd files
            creationflags=subprocess.CREATE_NEW_CONSOLE if system == "Windows" else 0
        )

        # Wait a moment to check if it started
        time.sleep(3)
        if process.poll() is None:
            print("[OK] Frontend started on http://localhost:5173")
            return process
        else:
            print("[ERROR] Frontend failed to start")
            return None

    except FileNotFoundError:
        print(f"[ERROR] npm not found at: {npm_cmd}")
        print("[ERROR] Install Node.js or check your PATH")
        return None
    except Exception as e:
        print(f"[ERROR] Failed to start frontend: {e}")
        return None


def main():
    """Main function to start both services"""
    print("=" * 50)
    print("Starting ZGoogies Application")
    print("=" * 50)

    # Start backend
    backend_process = start_backend()

    # Start frontend
    frontend_process = start_frontend()

    # Summary
    print("\n" + "=" * 50)
    if backend_process or frontend_process:
        print("[SUCCESS] Services started successfully")
        print("\nAccess the application:")
        print("  Frontend: http://localhost:5173")
        print("  Backend:  http://localhost:5000")
        print("\nLogin credentials:")
        print("  Username: admin")
        print("  Password: admin123")
        print("\nNote: Servers are running in separate windows")
        print("To stop: Run 'python stop.py'")
    else:
        print("[ERROR] No services were started")
    print("=" * 50)

    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nStartup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)
