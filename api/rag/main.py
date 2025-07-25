from pprint import pprint
from dotenv import load_dotenv
load_dotenv()
from compile_graph import app
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


if __name__ == "__main__":
    ques1='What are the types of agent memory?'
    ques2='What player at the Bears expected to draft first in the 2024 NFL draft?'
    inputs = {
    "question": ques1
    }
    for output in app.stream(inputs):
        for key, value in output.items():
            # Node
            pprint(f"Node '{key}':")
            # Optional: print full state at each node
            # pprint.pprint(value["keys"], indent=2, width=80, depth=None)
        pprint("\n---\n")

    # Final generation
    pprint(value["generation"])