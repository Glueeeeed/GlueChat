import { useState, useEffect } from 'react'
import { Badge } from '@renderer/components/app/profile/Badge'
import { validateOrRefreshToken } from '@renderer/assets/main'

interface UserProfileProps {
  authToken: string | null
  userId: string
  nickname: string
}

export function UserProfile({ authToken, userId, nickname }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authToken || !userId) return
      try {
        const authKey = await validateOrRefreshToken(authToken)
        const response = await fetch(`http://localhost:3000/api/profile/${userId}`, {
          headers: { Authorization: `Bearer ${authKey}` }
        })

        if (response.ok) {
          const data = await response.json()
          setProfile(data)
        }
      } catch (err) {
        console.error('Failed to fetch user profile', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUserProfile()
  }, [authToken, userId])

  if (loading)
    return (
      <div className="p-8 text-center animate-pulse uppercase text-xs font-bold text-gray-500">
        Loading Profile...
      </div>
    )

  const avatarUrl = profile?.avatarUrl
    ? `http://localhost:3000/api/profile/assets/avatar/${userId}`
    : null
  const bannerUrl = profile?.bannerUrl
    ? `http://localhost:3000/api/profile/assets/banner/${userId}`
    : null
  const bannerColor = profile?.bannerColor || '#0d1935'

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="relative h-120 rounded-2xl bg-gray-900/40 overflow-hidden border border-white/10 shadow-2xl">
        <div
          className="h-35 w-full"
          style={{
            backgroundColor: bannerUrl ? 'transparent' : bannerColor,
            backgroundImage: bannerUrl ? `url(${bannerUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="px-4 pb-4">
          <div className="relative mb-3">
            <div className="absolute -top-12 left-0">
              <div className="w-24 h-24 rounded-full flex items-center justify-center p-1.5 bg-gray-900">
                <div className="w-full h-full rounded-full bg-violet-600 flex items-center justify-center text-2xl font-bold border border-gray-900 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <p>{nickname.substring(0, 2).toUpperCase()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="font-bold flex-col mt-12 ml-6 flex justify-start">
          <h3 className="text-white text-xl">{nickname}</h3>
          <div className={'flex gap-0.5 mt-1'}>
            <Badge src="https://cdn3.emoji.gg/emojis/601949-owner.png" label="User" />
          </div>
        </div>

        <div className="flex flex-col w-[90%] bg-gray-950/40 rounded-xl mx-auto mt-6 p-4 border border-white/5">
          <label className="mb-2 font-bold text-[10px] uppercase text-gray-500 tracking-wider">
            About me
          </label>
          <p className="text-sm text-gray-300 leading-relaxed">
            {profile?.description || 'This user has no bio yet.'}
          </p>
        </div>
      </div>
    </div>
  )
}
