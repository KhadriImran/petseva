import { useEffect, useState } from 'react';
import { Badge, Button, Input, Modal } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/toast';

type Role = 'OWNER' | 'MANAGER' | 'CASHIER' | 'CAPTAIN' | 'KITCHEN';
interface StaffUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  hasPin: boolean;
}

const ROLE_HELP: Record<Role, string> = {
  OWNER: 'Everything, incl. staff accounts',
  MANAGER: 'Everything except staff; PIN approves voids & big discounts',
  CASHIER: 'Orders, bills, payments; small discounts only',
  CAPTAIN: 'Waiter: takes orders and sends KOT',
  KITCHEN: 'Kitchen display only',
};

/** Owner-only: add staff, reset passwords / PINs, switch accounts off when someone leaves. */
export default function AdminStaff() {
  const me = useAuth((s) => s.user);
  const [list, setList] = useState<StaffUser[] | null>(null);
  const [edit, setEdit] = useState<(Partial<StaffUser> & { password?: string; pin?: string }) | null>(null);

  const load = () =>
    api<StaffUser[]>('GET', '/outlets/me/users')
      .then(setList)
      .catch((e) => toast(e.message, 'err'));
  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!edit) return;
    try {
      if (edit.id) {
        await api('PATCH', `/outlets/me/users/${edit.id}`, { name: edit.name, role: edit.role, password: edit.password || undefined, pin: edit.pin || undefined });
      } else {
        await api('POST', '/outlets/me/users', edit);
      }
      toast('Saved', 'ok');
      setEdit(null);
      void load();
    } catch (e: any) {
      toast(e.message, 'err');
    }
  };

  const toggleActive = async (u: StaffUser) => {
    try {
      await api('PATCH', `/outlets/me/users/${u.id}`, { active: !u.active });
      void load();
    } catch (e: any) {
      toast(e.message, 'err');
    }
  };

  return (
    <div className="scroll-thin h-full overflow-y-auto p-4">
      <div className="mb-3 flex max-w-3xl items-center">
        <h1 className="font-semibold">Staff</h1>
        <Button variant="primary" className="ml-auto" onClick={() => setEdit({ role: 'CAPTAIN' })}>
          + Add staff
        </Button>
      </div>
      <div className="scroll-thin max-w-3xl overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">PIN</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(list ?? []).map((u) => (
              <tr key={u.id} className={u.active ? 'border-t border-slate-800' : 'border-t border-slate-800 opacity-50'}>
                <td className="px-3 py-2 font-medium">
                  {u.name} {u.id === me?.id && <span className="text-xs text-slate-500">(you)</span>}
                </td>
                <td className="px-3 py-2 text-slate-300">{u.username}</td>
                <td className="px-3 py-2">
                  <Badge tone={u.role === 'OWNER' ? 'purple' : u.role === 'MANAGER' ? 'blue' : 'slate'}>{u.role}</Badge>
                </td>
                <td className="px-3 py-2 text-slate-400">{u.hasPin ? 'set' : '—'}</td>
                <td className="space-x-2 px-3 py-2 text-right">
                  <Button size="sm" onClick={() => setEdit({ ...u })}>
                    Edit
                  </Button>
                  {u.id !== me?.id && (
                    <Button size="sm" variant={u.active ? 'ghost' : 'outline'} onClick={() => toggleActive(u)}>
                      {u.active ? 'Switch off' : 'Switch on'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list === null && <div className="p-4 text-sm text-slate-500">Loading…</div>}
      </div>
      <p className="mt-3 max-w-3xl text-xs text-slate-500">A switched-off account can no longer sign in. Managers and owners can set a 4–6 digit PIN; it is asked on the POS to approve voids and discounts above the cashier limit.</p>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? `Edit ${edit.name}` : 'Add staff'}
        footer={
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        }
      >
        {edit && (
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <label className="sm:col-span-2">
              Name
              <Input value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Ramesh" autoFocus />
            </label>
            <label>
              Username
              <Input value={edit.username ?? ''} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, username: e.target.value.toLowerCase().replace(/\s/g, '') })} placeholder="e.g. ramesh" />
            </label>
            <label>
              {edit.id ? 'New password (leave empty to keep)' : 'Password'}
              <Input type="text" value={edit.password ?? ''} onChange={(e) => setEdit({ ...edit, password: e.target.value })} placeholder="min 6 characters" />
            </label>
            <label className="sm:col-span-2">
              Role
              <select className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-2" value={edit.role} disabled={edit.id === me?.id} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>
                {(Object.keys(ROLE_HELP) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {r} — {ROLE_HELP[r]}
                  </option>
                ))}
              </select>
            </label>
            {(edit.role === 'OWNER' || edit.role === 'MANAGER') && (
              <label className="sm:col-span-2">
                {edit.hasPin ? 'New PIN (leave empty to keep)' : 'Approval PIN (4–6 digits)'}
                <Input inputMode="numeric" maxLength={6} value={edit.pin ?? ''} onChange={(e) => setEdit({ ...edit, pin: e.target.value.replace(/\D/g, '') })} />
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
