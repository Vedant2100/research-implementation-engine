/**
 * Build a Colab-ready .ipynb from the current editor code and open Colab.
 * Colab cannot accept arbitrary code via URL; we download the notebook and
 * open colab.research.google.com so the user uploads it (or drags onto the tab).
 */

function toNotebookSource(text) {
  const lines = String(text ?? "").split("\n");
  if (lines.length === 1 && lines[0] === "") return [];
  return lines.map((line, i) => (i < lines.length - 1 ? `${line}\n` : line));
}

function slugFilename(title) {
  const slug = String(title || "assignment")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "assignment"}.ipynb`;
}

/**
 * @param {{ title: string, paperRef?: string, code: string }} opts
 */
export function buildColabNotebook({ title, paperRef, code }) {
  const mdLines = [
    `# ${title || "Assignment"}\n`,
    "\n",
    paperRef ? `**Paper:** ${paperRef}\n\n` : "",
    "Exported from PyTorch Research Engine.\n\n",
    "**In Colab:** enable GPU if you need it (`Runtime` → `Change runtime type` → GPU), then run all cells.\n",
  ];

  const setupCode = [
    "# Colab setup — PyTorch is usually preinstalled; install only if imports fail.\n",
    "try:\n",
    "    import torch\n",
    "except ImportError:\n",
    "    %pip install -q torch\n",
    "\n",
    "import torch\n",
    "print('PyTorch', torch.__version__)\n",
    "print('Device:', 'cuda' if torch.cuda.is_available() else 'cpu')\n",
  ];

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      colab: {
        name: slugFilename(title),
        provenance: [],
      },
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: {
        name: "python",
        version: "3.10.0",
      },
    },
    cells: [
      {
        cell_type: "markdown",
        metadata: {},
        source: mdLines,
      },
      {
        cell_type: "code",
        metadata: {},
        source: toNotebookSource(setupCode.join("")),
        outputs: [],
        execution_count: null,
      },
      {
        cell_type: "code",
        metadata: {},
        source: toNotebookSource(code),
        outputs: [],
        execution_count: null,
      },
    ],
  };
}

/** @param {object} notebook */
export function downloadNotebook(notebook, filename) {
  const json = JSON.stringify(notebook, null, 1);
  const blob = new Blob([json], { type: "application/x-ipynb+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {{ title: string, paperRef?: string, code: string }} opts
 * @returns {{ filename: string }}
 */
export function openInColab(opts) {
  const filename = slugFilename(opts.title);
  const notebook = buildColabNotebook(opts);
  downloadNotebook(notebook, filename);
  window.open("https://colab.research.google.com/#", "_blank", "noopener,noreferrer");
  return { filename };
}
