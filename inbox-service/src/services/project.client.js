// Tiny client for project-service /internal endpoints. Auth via the shared
// JWT_SECRET in the X-Internal-Token header (no network egress — services
// talk on the docker bridge).

const ProjectIndex = require('../models/ProjectIndex');

const BASE = process.env.PROJECT_SERVICE_URL || 'http://project-service:3002';

const headers = () => ({
  'X-Internal-Token': process.env.JWT_SECRET || '',
  Accept: 'application/json',
});

const fetchAllProjects = async () => {
  const r = await fetch(`${BASE}/internal/projects`, { headers: headers() });
  if (!r.ok) throw new Error(`GET /internal/projects → ${r.status}`);
  return r.json();
};

const fetchProject = async (projectId) => {
  const r = await fetch(`${BASE}/internal/projects/${projectId}`, { headers: headers() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET /internal/projects/${projectId} → ${r.status}`);
  return r.json();
};

// Bulk-seed ProjectIndex from project-service. Safe to run on every boot —
// upserts only, no destructive ops. Logs progress so we can spot failures.
const backfillProjectIndex = async () => {
  try {
    const projects = await fetchAllProjects();
    if (!Array.isArray(projects) || !projects.length) {
      console.log('[backfill] no projects to seed');
      return;
    }
    const ops = projects.map((p) => ({
      updateOne: {
        filter: { projectId: p.projectId },
        update: { $set: { projectId: p.projectId, ownerId: p.ownerId, members: p.members || [] } },
        upsert: true,
      },
    }));
    const res = await ProjectIndex.bulkWrite(ops);
    console.log(`[backfill] seeded ProjectIndex: ${res.upsertedCount} new, ${res.modifiedCount} updated, total ${projects.length}`);
  } catch (err) {
    // Non-fatal: backfill is best-effort. Lazy fetch on cache miss covers gaps.
    console.warn('[backfill] could not seed ProjectIndex:', err.message);
  }
};

// Lazy fetch + upsert when a task.created event arrives for a project we
// haven't indexed yet. Returns the up-to-date ProjectIndex doc or null.
const ensureProjectIndex = async (projectId) => {
  const existing = await ProjectIndex.findOne({ projectId });
  if (existing) return existing;
  try {
    const fresh = await fetchProject(projectId);
    if (!fresh) return null;
    return ProjectIndex.findOneAndUpdate(
      { projectId: fresh.projectId },
      { $set: { projectId: fresh.projectId, ownerId: fresh.ownerId, members: fresh.members || [] } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn(`[ensureProjectIndex] lookup failed for ${projectId}: ${err.message}`);
    return null;
  }
};

module.exports = { backfillProjectIndex, ensureProjectIndex };
