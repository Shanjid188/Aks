// Role and admin management: nobody can hand out access they do not have.
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { STAFF_PERMISSIONS } from './helpers/db.ts';

useTestServer();

const MANAGER_PERMISSIONS = [
  ...STAFF_PERMISSIONS,
  'roles.view',
  'roles.create',
  'roles.edit',
  'admins.view',
  'admins.create',
  'admins.edit',
];
const MANAGER = { email: 'manager@test.local', password: 'manager-pass-1' };

let superToken: string;
let managerToken: string;
let managerRoleId: string;
let superRoleId: string;
let staffRoleId: string;

async function loginAs(email: string, password: string): Promise<string> {
  const res = await api().post('/api/admin/auth/login', { email, password });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.token;
}

before(async () => {
  superToken = await login('super');
  const roles = (await api(superToken).get('/api/admin/roles')).body.roles;
  superRoleId = roles.find((r: any) => r.isSuper).id;
  staffRoleId = roles.find((r: any) => !r.isSuper && r.permissions.length === STAFF_PERMISSIONS.length).id;

  const role = await api(superToken).post('/api/admin/roles', { name: 'Manager', permissions: MANAGER_PERMISSIONS });
  assert.equal(role.status, 201, JSON.stringify(role.body));
  managerRoleId = role.body.role.id;
  const admin = await api(superToken).post('/api/admin/admins', { name: 'Manager', ...MANAGER, roleId: managerRoleId });
  assert.equal(admin.status, 201, JSON.stringify(admin.body));
  managerToken = await loginAs(MANAGER.email, MANAGER.password);
});

describe('granting permissions through roles (#6)', () => {
  it('cannot add a permission to their own role that they do not have', async () => {
    const res = await api(managerToken).put(`/api/admin/roles/${managerRoleId}`, {
      permissions: [...MANAGER_PERMISSIONS, 'settings.edit'],
    });
    assert.equal(res.status, 403);
    const role = (await api(superToken).get('/api/admin/roles')).body.roles.find((r: any) => r.id === managerRoleId);
    assert.ok(!role.permissions.includes('settings.edit'));
  });

  it('cannot create a role with permissions they do not have', async () => {
    const res = await api(managerToken).post('/api/admin/roles', { name: 'Sneaky', permissions: ['settings.edit'] });
    assert.equal(res.status, 403);
  });

  it('can create a role from permissions they have', async () => {
    const res = await api(managerToken).post('/api/admin/roles', { name: 'Viewer', permissions: ['orders.view'] });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });

  it('can edit a role that keeps permissions they lack, without adding new ones', async () => {
    const created = await api(superToken).post('/api/admin/roles', { name: 'Settings', permissions: ['settings.edit', 'orders.view'] });
    const id = created.body.role.id;
    const res = await api(managerToken).put(`/api/admin/roles/${id}`, {
      name: 'Settings team',
      permissions: ['settings.edit', 'orders.view', 'products.view'],
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
  });

  it('a Super Admin can still grant anything', async () => {
    const res = await api(superToken).post('/api/admin/roles', { name: 'Everything', permissions: ['settings.edit', 'roles.edit'] });
    assert.equal(res.status, 201);
  });
});

describe('assigning roles to admins (#5)', () => {
  it('cannot create a Super Admin', async () => {
    const res = await api(managerToken).post('/api/admin/admins', {
      name: 'Shadow',
      email: 'shadow@test.local',
      password: 'shadow-pass-1',
      roleId: superRoleId,
    });
    assert.equal(res.status, 403);
  });

  it('cannot make an existing admin a Super Admin', async () => {
    const admins = (await api(superToken).get('/api/admin/admins')).body.admins;
    const staff = admins.find((a: any) => a.email === 'staff@test.local');
    const res = await api(managerToken).patch(`/api/admin/admins/${staff.id}`, { roleId: superRoleId });
    assert.equal(res.status, 403);
    const after = (await api(superToken).get('/api/admin/admins')).body.admins.find((a: any) => a.id === staff.id);
    assert.equal(after.isSuperAdmin, false);
  });

  it('cannot assign a role with permissions they do not have', async () => {
    const role = await api(superToken).post('/api/admin/roles', { name: 'Settings only', permissions: ['settings.edit'] });
    const res = await api(managerToken).post('/api/admin/admins', {
      name: 'Helper',
      email: 'helper@test.local',
      password: 'helper-pass-1',
      roleId: role.body.role.id,
    });
    assert.equal(res.status, 403);
  });

  it('can assign a role within their own permissions', async () => {
    const res = await api(managerToken).post('/api/admin/admins', {
      name: 'New staff',
      email: 'newstaff@test.local',
      password: 'newstaff-pass-1',
      roleId: staffRoleId,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });

  it('cannot reset the password of a more powerful admin', async () => {
    const role = await api(superToken).post('/api/admin/roles', { name: 'Boss', permissions: [...MANAGER_PERMISSIONS, 'settings.edit'] });
    const boss = await api(superToken).post('/api/admin/admins', {
      name: 'Boss',
      email: 'boss@test.local',
      password: 'boss-pass-123',
      roleId: role.body.role.id,
    });
    const res = await api(managerToken).put(`/api/admin/admins/${boss.body.admin.id}/password`, { password: 'taken-over-1' });
    assert.equal(res.status, 403);
    await loginAs('boss@test.local', 'boss-pass-123');
  });
});
