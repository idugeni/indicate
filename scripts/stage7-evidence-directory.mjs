import { lstat, mkdir, realpath, rm } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export const STAGE7_EVIDENCE_ROOT_NAME = '.stage7-evidence';
export const STAGE7_EVIDENCE_ARTIFACTS = Object.freeze([
  'acceptance-matrix.json',
  'production-readiness.json',
  'promotion-decision.json',
  'quality-diagnostics.json',
]);

function isContained(parent, candidate) {
  const path = relative(parent, candidate);
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

async function rejectSymlinkComponents(root, candidate) {
  const path = relative(root, candidate);
  let current = root;
  for (const component of path.split(sep).filter(Boolean)) {
    current = resolve(current, component);
    try {
      const metadata = await lstat(current);
      if (metadata.isSymbolicLink()) throw new Error('stage7_evidence_symlink_rejected');
    } catch (error) {
      if (error instanceof Error && error.message === 'stage7_evidence_symlink_rejected') throw error;
      if (error?.code !== 'ENOENT') throw error;
      break;
    }
  }
}

export async function prepareStage7EvidenceDirectory(repositoryRoot, configuredPath) {
  const root = await realpath(repositoryRoot);
  const requested = configuredPath ?? STAGE7_EVIDENCE_ROOT_NAME;
  if (requested.length === 0 || isAbsolute(requested)) throw new Error('stage7_evidence_path_must_be_relative');
  const components = requested.split(/[\\/]+/u);
  if (components.some((component) => component === '' || component === '.' || component === '..')) {
    throw new Error('stage7_evidence_path_traversal_rejected');
  }
  if (components[0] !== STAGE7_EVIDENCE_ROOT_NAME) throw new Error('stage7_evidence_path_outside_dedicated_root');

  const dedicatedRoot = resolve(root, STAGE7_EVIDENCE_ROOT_NAME);
  const evidenceDirectory = resolve(root, ...components);
  if (evidenceDirectory !== dedicatedRoot && !isContained(dedicatedRoot, evidenceDirectory)) {
    throw new Error('stage7_evidence_path_outside_dedicated_root');
  }
  await rejectSymlinkComponents(root, evidenceDirectory);
  await mkdir(evidenceDirectory, { recursive: true, mode: 0o700 });
  await rejectSymlinkComponents(root, evidenceDirectory);
  const resolvedEvidenceDirectory = await realpath(evidenceDirectory);
  if (resolvedEvidenceDirectory !== dedicatedRoot && !isContained(dedicatedRoot, resolvedEvidenceDirectory)) {
    throw new Error('stage7_evidence_symlink_rejected');
  }

  await Promise.all(STAGE7_EVIDENCE_ARTIFACTS.map((name) => rm(resolve(resolvedEvidenceDirectory, name), { force: true })));
  return resolvedEvidenceDirectory;
}
