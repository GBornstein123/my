import { spawn } from 'node:child_process';
import { access, constants } from 'node:fs/promises';

// Local, fully-offline STT by shelling out to a whisper.cpp CLI binary.
// On Windows, scripts/setup-local-mode.ps1 downloads the prebuilt
// whisper-cli.exe and the ggml-base.en model. Chosen over a native binding
// for v1: zero build complexity, identical output, and the process exits
// between dictations so idle RAM stays near zero (PRD G3).

// whisper-cli prints the transcript to stdout (log noise goes to stderr).
export function parseWhisperOutput(stdout) {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function localTranscriber({
  binaryPath,
  modelPath,
  vocabularyHint = [],
  threads = 4,
  spawnImpl = spawn,
}) {
  return {
    async transcribe(audioFilePath) {
      try {
        await access(binaryPath, constants.X_OK);
      } catch {
        throw new Error(
          `whisper-cli not found at "${binaryPath}" — run scripts/setup-local-mode.ps1`);
      }
      try {
        await access(modelPath, constants.R_OK);
      } catch {
        throw new Error(
          `Whisper model not found at "${modelPath}" — run scripts/setup-local-mode.ps1`);
      }

      const args = [
        '-m', modelPath,
        '-f', audioFilePath,
        '--language', 'en',
        '--no-timestamps',
        '--threads', String(threads),
      ];
      if (vocabularyHint.length > 0) {
        args.push('--prompt', vocabularyHint.join(', '));
      }

      const { code, stdout, stderr } = await run(spawnImpl, binaryPath, args);
      if (code !== 0) {
        throw new Error(`whisper-cli exited with ${code}: ${stderr.slice(0, 500)}`);
      }
      return parseWhisperOutput(stdout);
    },
  };
}

function run(spawnImpl, command, args) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}
