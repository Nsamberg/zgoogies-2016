#!/usr/bin/env python3
"""
ZGoogies Application Stopper
Stops both frontend (port 5173) and backend (port 5001) servers
"""
import subprocess
import platform
import sys


def get_process_by_port(port):
    """Get process ID listening on the specified port"""
    system = platform.system()

    try:
        if system == "Windows":
            # Use netstat on Windows
            result = subprocess.run(
                ['netstat', '-ano'],
                capture_output=True,
                text=True,
                check=True
            )

            for line in result.stdout.split('\n'):
                if f':{port}' in line and 'LISTENING' in line:
                    parts = line.split()
                    if parts:
                        pid = parts[-1]
                        try:
                            return int(pid)
                        except ValueError:
                            continue
        else:
            # Use lsof on Unix-like systems
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'],
                capture_output=True,
                text=True,
                check=True
            )

            if result.stdout.strip():
                return int(result.stdout.strip().split()[0])

    except (subprocess.CalledProcessError, FileNotFoundError, ValueError):
        pass

    return None


def kill_process(pid, process_name):
    """Kill a process by PID"""
    system = platform.system()

    try:
        if system == "Windows":
            # Try taskkill with tree option first
            result = subprocess.run(['taskkill', '/PID', str(pid), '/F', '/T'],
                                  capture_output=True,
                                  text=True)

            # Check if it worked
            if result.returncode == 0:
                print(f"[OK] {process_name} stopped (PID: {pid})")
                return True
            elif "not found" in result.stderr.lower() or "not found" in result.stdout.lower():
                # Process already gone
                print(f"[OK] {process_name} already stopped (PID: {pid})")
                return True
            else:
                # Try PowerShell as backup
                ps_result = subprocess.run(
                    ['powershell', '-Command', f'Stop-Process -Id {pid} -Force -ErrorAction SilentlyContinue'],
                    capture_output=True
                )
                if ps_result.returncode == 0:
                    print(f"[OK] {process_name} stopped (PID: {pid})")
                    return True
                else:
                    print(f"[WARNING] {process_name} (PID: {pid}) may still be running")
                    return False
        else:
            subprocess.run(['kill', '-9', str(pid)],
                         check=True,
                         capture_output=True)
            print(f"[OK] {process_name} stopped (PID: {pid})")
            return True

    except Exception as e:
        print(f"[ERROR] Failed to stop {process_name} (PID: {pid}): {e}")
        return False


def main():
    """Main function to stop both frontend and backend"""
    print("=" * 50)
    print("Stopping ZGoogies Application")
    print("=" * 50)

    stopped_count = 0

    # Stop Backend (port 5001)
    print("\nChecking Backend (port 5001)...")
    backend_pid = get_process_by_port(5001)
    if backend_pid:
        if kill_process(backend_pid, "Backend"):
            stopped_count += 1
    else:
        print("[OK] Backend not running")

    # Stop Frontend (port 5173)
    print("\nChecking Frontend (port 5173)...")
    frontend_pid = get_process_by_port(5173)
    if frontend_pid:
        if kill_process(frontend_pid, "Frontend"):
            stopped_count += 1
    else:
        print("[OK] Frontend not running")

    # Summary
    print("\n" + "=" * 50)
    if stopped_count > 0:
        print(f"[SUCCESS] Stopped {stopped_count} service(s)")
    else:
        print("[OK] No services were running")
    print("=" * 50)

    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nStopping script interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        sys.exit(1)
