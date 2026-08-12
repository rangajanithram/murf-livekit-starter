import json
import sys
import argparse
import database

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--resolve", type=str, help="Escalation ID to resolve")
    
    args = parser.parse_args()
    
    if args.list:
        escalations = database.get_escalations()
        print(json.dumps(escalations))
    elif args.resolve:
        success = database.resolve_escalation(args.resolve)
        print(json.dumps({"success": success}))

if __name__ == "__main__":
    main()
