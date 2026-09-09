import Image from "next/image";
import {
  AVATAR_OPTIONS,
  PROFILE_FRAME_OPTIONS,
} from "@findmysensi/trainer-runtime";

interface PlayerAvatarProps {
  readonly avatarId: string;
  readonly frameId?: string;
  readonly label: string;
  readonly size?: number;
  readonly priority?: boolean;
}

export function PlayerAvatar({
  avatarId,
  frameId = "frame-none",
  label,
  size = 48,
  priority = false,
}: PlayerAvatarProps) {
  const avatar =
    AVATAR_OPTIONS.find((option) => option.id === avatarId) ??
    AVATAR_OPTIONS[0]!;
  const frame = PROFILE_FRAME_OPTIONS.find((option) => option.id === frameId);

  return (
    <span
      className="profile-avatar"
      style={{ width: size, height: size }}
      title={label}
    >
      <Image
        src={avatar.imageSrc}
        alt={`${label} profile picture`}
        width={size}
        height={size}
        sizes={`${size}px`}
        priority={priority}
        unoptimized
        className="profile-avatar-image"
      />
      {frame?.imageSrc ? (
        <Image
          src={frame.imageSrc}
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          sizes={`${size}px`}
          unoptimized
          className="profile-avatar-frame"
        />
      ) : null}
    </span>
  );
}
