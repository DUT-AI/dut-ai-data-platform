import sys

from loguru import logger


def main():
    """Management CLI script for administrative actions."""
    if len(sys.argv) < 2:
        print("Usage: python apps/cli/manage.py <command>")
        print("Available commands: ping, info")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "ping":
        logger.info("Pong!")
    elif cmd == "info":
        logger.info("DUT AI Data Platform CLI Manager")
    else:
        logger.error(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
