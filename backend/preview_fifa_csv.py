#!/usr/bin/env python3
"""
Preview script to examine the FIFA World Cup 2026 CSV file structure.
Run this before import to verify the file format.
"""

import os
import sys
import csv


def preview_csv_file(csv_file_path, num_rows=15):
    """Preview the contents of the CSV file"""

    print("=" * 100)
    print("FIFA World Cup 2026 CSV File Preview")
    print("=" * 100)

    # Check if file exists
    if not os.path.exists(csv_file_path):
        print(f"\n[ERROR] CSV file not found: {csv_file_path}")
        return False

    try:
        # Load CSV file
        print(f"\nFile: {csv_file_path}")

        with open(csv_file_path, 'r', encoding='utf-8-sig') as csvfile:
            # Read headers
            csv_reader = csv.DictReader(csvfile)
            headers = csv_reader.fieldnames

            print(f"Total columns: {len(headers)}")
            print(f"\nColumn Headers:")
            for i, header in enumerate(headers, 1):
                print(f"  {i}. {header}")

            # Check for Competition Round column
            comp_round_col = None
            for header in headers:
                if 'competition round' in header.lower() or header.lower() == 'round':
                    comp_round_col = header
                    print(f"\n[FOUND] 'Competition Round' column: '{comp_round_col}'")
                    break

            if not comp_round_col:
                print(f"\n[WARNING] 'Competition Round' column not found")
                print("           Games will be auto-distributed across rounds")

            # Read all rows
            csvfile.seek(0)
            csv_reader = csv.DictReader(csvfile)
            rows = list(csv_reader)

            total_rows = len(rows)
            print(f"\nTotal data rows: {total_rows}")

            # Show first few rows
            print(f"\nFirst {min(num_rows, total_rows)} rows:")
            print("-" * 100)

            for i, row in enumerate(rows[:num_rows], 1):
                print(f"\nRow {i}:")
                for header in headers:
                    value = row.get(header, '')
                    if len(str(value)) > 40:
                        value = str(value)[:40] + "..."
                    print(f"  {header}: {value}")

            # Count non-empty game rows
            game_count = 0
            for row in rows:
                team_a = None
                team_b = None
                for header in headers:
                    if 'team a' in header.lower():
                        team_a = row.get(header)
                    elif 'team b' in header.lower():
                        team_b = row.get(header)
                if team_a and team_b:
                    game_count += 1

            print("\n" + "=" * 100)
            print(f"Estimated game count: {game_count}")

            # Check Competition Round distribution
            if comp_round_col:
                round_counts = {}
                for row in rows:
                    round_val = row.get(comp_round_col, '').strip()
                    if round_val:
                        round_counts[round_val] = round_counts.get(round_val, 0) + 1

                if round_counts:
                    print(f"\nCompetition Round Distribution:")
                    for round_name in sorted(round_counts.keys()):
                        print(f"  {round_name}: {round_counts[round_name]} games")

            print("=" * 100)

            # Recommendations
            print("\nExpected CSV Structure for Import:")
            print("  Required columns (case-insensitive):")
            print("    - Date")
            print("    - Time")
            print("    - Team A")
            print("    - Team B")
            print("  Optional columns:")
            print("    - Stadium / Venue / Location")
            print("    - City")
            print("    - Stage (Group A, Round of 16, etc.)")
            print("    - Competition Round (HIGHLY RECOMMENDED - e.g., 'Round 1', 'Round 2')")
            print("\nThe import script will auto-detect column names.")
            print("=" * 100)

            return True

    except Exception as e:
        print(f"\n[ERROR] Failed to preview file: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main function"""
    # Path to CSV file
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_file = os.path.join(project_root, 'config', 'FIFA World Cup 2026.csv')

    preview_csv_file(csv_file, num_rows=15)

    return 0


if __name__ == '__main__':
    sys.exit(main())
