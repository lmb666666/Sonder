import ProfileCard from '../react/ProfileCard';

interface Props {
  name: string;
  title: string;
  handle: string;
  status: string;
  avatarUrl: string;
  iconUrl: string;
  miniAvatarUrl: string;
}

export default function AboutAvatar({
  name,
  title,
  handle,
  status,
  avatarUrl,
  iconUrl,
  miniAvatarUrl,
}: Props) {
  return (
    <div className="about-avatar-react">
      <ProfileCard
        avatarUrl={avatarUrl}
        iconUrl={iconUrl}
        miniAvatarUrl={miniAvatarUrl}
        name={name}
        title={title}
        handle={handle}
        status={status}
        statusColor="#7a9a74"
        theme="light"
        radius={24}
        holo={0.38}
        glare={0.4}
        parallax={6}
        tiltStrength={8}
      />
    </div>
  );
}
