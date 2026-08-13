import json
import sys
import argparse
import database

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true", help="List all call analytics")
    args = parser.parse_args()

    if args.list:
        analytics = database.get_call_analytics()
        print(json.dumps(analytics))
    else:
        print(json.dumps({"error": "No action specified"}))

if __name__ == "__main__":
    main()
