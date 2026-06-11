import {prisma} from "../../lib/prisma";
import path from "path";
import fs from "node:fs/promises";
import {activeConnections} from "../../app";

interface Friendship {
    id: string;
    senderId: string;
    receiverId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}


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

            const friends : Friendship[]  = await prisma.friendship.findMany({
                where: {

                    OR: [
                        {
                            receiverId: userId,
                            status: 'ACCEPTED'
                        },
                        {
                            receiverId: userId,
                            status: 'ACCEPTED'
                        },
                    ]
                },
            })

            let friend ;

            friends.map((friend: Friendship) => {

                    if (friend.senderId === userId) {
                        const ws = activeConnections.get(friend.receiverId);
                        ws?.forEach(conn => conn.send({
                            type: 'PROFILE_UPDATED',
                            payload: {},
                        }))
                    } else {
                        const ws = activeConnections.get(friend.senderId);
                        ws?.forEach(conn => conn.send({
                            type: 'PROFILE_UPDATED',
                            payload: {},
                        }))
                    }
            });


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
                    select: {
                        badges: {
                            include: {
                                badge: true,
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