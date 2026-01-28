import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { teamsAPI, usersAPI } from '../services/api';
import { UsersRound, Plus, Search, Mail, Shield, Crown, UserPlus, X } from 'lucide-react';

const Team: React.FC = () => {
  const navigate = useNavigate();
  const { team: currentTeam } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ userId: '', role: 'member' });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!currentTeam?.id) return;
      try {
        const [teamRes, usersRes] = await Promise.all([
          teamsAPI.getById(currentTeam.id),
          usersAPI.getAll()
        ]);
        setTeam(teamRes.data);
        setAllUsers(usersRes.data);
      } catch (error) {
        console.error('Error fetching team:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [currentTeam?.id]);

  const handleMemberClick = (memberId: string) => {
    navigate(`/team/${memberId}`);
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.userId || !currentTeam?.id) return;

    setInviting(true);
    try {
      await teamsAPI.addMember(currentTeam.id, {
        userId: inviteData.userId,
        role: inviteData.role,
      });
      // Refresh team data
      const teamRes = await teamsAPI.getById(currentTeam.id);
      setTeam(teamRes.data);
      setShowInviteModal(false);
      setInviteData({ userId: '', role: 'member' });
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setInviting(false);
    }
  };

  // Get users who are not already team members
  const availableUsers = allUsers.filter(
    user => !team?.members?.some((m: any) => m.id === user.id)
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      default: return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return '#d97706';
      case 'admin': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const filteredMembers = team?.members?.filter((m: any) =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{team?.name || 'Team'}</h1>
          <p className="page-subtitle">{team?.members?.length || 0} team members</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
          <UserPlus size={18} />
          Invite Member
        </button>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontWeight: '600' }}>Invite Team Member</h2>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                onClick={() => setShowInviteModal(false)}
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>

            <form onSubmit={handleInviteMember}>
              <div className="form-group">
                <label className="form-label">Select User *</label>
                <select
                  className="form-input"
                  value={inviteData.userId}
                  onChange={(e) => setInviteData({ ...inviteData, userId: e.target.value })}
                  required
                >
                  <option value="">Choose a user to invite</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && (
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                    All users are already members of this team.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-input"
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={inviting || !inviteData.userId}
                  style={{ flex: 1 }}
                >
                  <UserPlus size={18} />
                  {inviting ? 'Inviting...' : 'Invite Member'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card" onClick={() => navigate('/analytics')}>
          <div className="stat-icon blue"><UsersRound size={18} /></div>
          <div className="stat-value">{team?.members?.length || 0}</div>
          <div className="stat-label">Team Members</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/settings')}>
          <div className="stat-icon purple"><Shield size={18} /></div>
          <div className="stat-value">{team?.plan || 'Starter'}</div>
          <div className="stat-label">Current Plan</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/settings')}>
          <div className="stat-icon green"><Crown size={18} /></div>
          <div className="stat-value">${team?.monthlyPrice || 50}</div>
          <div className="stat-label">Per User/Month</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/settings')}>
          <div className="stat-icon orange"><Mail size={18} /></div>
          <div className="stat-value">${(team?.members?.length || 1) * (team?.monthlyPrice || 50)}</div>
          <div className="stat-label">Monthly Cost</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Team Members</h3>
        <div className="table-container" style={{ boxShadow: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Team Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member: any) => {
                const RoleIcon = getRoleIcon(member.teamRole);
                return (
                  <tr key={member.id} onClick={() => handleMemberClick(member.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500' }}>{member.firstName} {member.lastName}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${member.userRole}`}>{member.userRole}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {RoleIcon && <RoleIcon size={14} color={getRoleColor(member.teamRole)} />}
                        <span style={{ color: getRoleColor(member.teamRole), fontWeight: '500' }}>
                          {member.teamRole}
                        </span>
                      </div>
                    </td>
                    <td>{new Date(member.joinedAt || member.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredMembers.length === 0 && (
        <div className="empty-state" style={{ marginTop: '24px' }}>
          <UsersRound size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No team members found</h3>
          <p>Invite team members to start collaborating on sales outreach.</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowInviteModal(true)}>
            <UserPlus size={18} />
            Invite Member
          </button>
        </div>
      )}
    </div>
  );
};

export default Team;
