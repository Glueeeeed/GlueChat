import {prisma} from "../../lib/prisma";
import path from "path";
import fs from "node:fs/promises";

export abstract class ProfileService {
    static async updateProfile(userId: string, avatar: File | undefined, banner: File | undefined, description: string | undefined, bannerColor: string | undefined) {
        const uploadDir = path.join(process.cwd(), "uploads");

        let avatarName: string | undefined;
        let bannerName: string | null;

        const currentProfile = await prisma.profiles.findUnique({
            where: { userId }
        });

        if (avatar) {
            if (currentProfile?.avatarUrl) {
                const oldPath = path.join(uploadDir, currentProfile.avatarUrl);
                await fs.unlink(oldPath).catch(() => {});
            }
            avatarName = `avatar_${userId}.${avatar.type.split("/")[1]}`;
            await Bun.write(path.join(uploadDir, avatarName), avatar);
        }

        if (banner) {
            if (currentProfile?.bannerUrl) {
                const oldPath = path.join(uploadDir, currentProfile.bannerUrl);
                await fs.unlink(oldPath).catch(() => {});
            }
            bannerName = `banner_${userId}.${banner.type.split("/")[1]}`;
            await Bun.write(path.join(uploadDir, bannerName), banner);
        } else {
            if (currentProfile?.bannerUrl) {
                const oldPath = path.join(uploadDir, currentProfile.bannerUrl);
                await fs.unlink(oldPath).catch(() => {});
            }
            bannerName = null;
        }

        return  prisma.profiles.upsert({
            where: {
                userId: userId
            },
            update: {
                description,
                bannerColor,
                ...(avatarName && { avatarUrl: avatarName }),
                bannerUrl: bannerName,
            },
            create: {
                userId,
                description,
                bannerColor,
                avatarUrl: avatarName || null,
                bannerUrl: bannerName || null,
            }
        });
    }

    static async getProfileAssetsPath(userId : string, type : string) {
        if (type === "avatar") {
            const avatar = await prisma.profiles.findUnique({
                where: {userId},
                select: {
                    avatarUrl: true
                }
            });
            return avatar.avatarUrl;
        } else {
            const banner = await prisma.profiles.findUnique({
                where: {userId},
                select: {
                    bannerUrl: true
                }
            });
            return banner.bannerUrl;
        }
    }

    static async removeBannerColor(userId : string) {
        await prisma.profiles.update({
            where: {
                userId: userId
            },
            data: {
                bannerColor: null
            }
        })
    }

    private static async removeBannerUrl(userId : string) {
        await prisma.profiles.update({
            where: {
                userId: userId,
            },
            data: {
                bannerUrl: null
            }
        })
    }

    private static async removeAvatarUrl(userId : string) {
        await prisma.profiles.update({
            where: {
                userId: userId
            },
            data: {
                avatarUrl: null
            }
        })
    }

    static async handleRemove(type: string , userId: string) {
        if (type === "avatar") {
            await this.removeAvatarUrl(userId);
        } else {
            await this.removeBannerUrl(userId);
        }
    }

    static async getProfile(userId: string) {
        const profile = await prisma.profiles.findUnique({
            where: { userId },
            include: {
                user: {
                    include: {
                        badges: {
                            include: {
                                badge: true
                            }
                        }
                    }
                }
            }
        });

        if (!profile) return null;

        return {
            ...profile,
            badges: profile.user.badges.map(ub => ub.badge)
        };
    }
}