import { useState, ChangeEvent, JSX } from 'react'
import {Badge} from "@renderer/components/app/profile/Badge"
import { validateOrRefreshToken } from '@renderer/assets/main'

interface ProfileSettingsProps {
  authToken: string | null
}

export function ProfileSettings({authToken}: ProfileSettingsProps) {
  const [bio, setBio] = useState( "")
  const [avatar, setAvatar] = useState("")
  const [banner, setBanner] = useState('#0d1935')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)

  const handleBannerFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBannerFile(file);
      const reader = new FileReader()
      reader.onloadend = () => {
        setBanner(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }


  const handleAvatarFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    const authKey: string = await validateOrRefreshToken(authToken as string);

    const formData = new FormData()
    if (avatar) {
      formData.append('avatar', avatarFile as File);
    }
    if (bannerFile) {
      formData.append('banner', bannerFile as File);
    } else {
      formData.append('bannerColor', banner);
    }


    formData.append('description', bio);

    await fetch('http://localhost:3000/api/profile/update', {
      headers: {
        Authorization: `Bearer ${authKey}`
      },
      method: 'POST',
      body: formData
    })
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 overflow-y-auto h-full">
      <h2 className="text-2xl font-bold uppercase tracking-widest text-white">Your Profile</h2>

      <div className="relative h-80 rounded-2xl bg-gray-900/40 overflow-hidden border border-white/10 shadow-2xl">
        <div
          className="h-24 w-full"
          style={{
            backgroundColor: banner.startsWith('#') ? banner : 'transparent',
            backgroundImage: banner.startsWith('#') ? 'none' : `url(${banner})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="px-4 pb-4">
          <div className="relative mb-3">
            <div className="absolute -top-12 left-0">
              <div className="relative">
                <div className="w-24 h-24 rounded-full flex items-center justify-center p-1.5 bg-gray-900">
                  <div className="w-full h-full rounded-full bg-violet-600 flex items-center justify-center text-2xl font-bold border border-gray-900 overflow-hidden">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full" />
                    ) : (
                      <p>{localStorage.getItem('nickname')?.substring(0, 2) || 'GC'}</p>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-4 border-gray-900" />
              </div>
            </div>
          </div>
        </div>

        <div className="font-bold flex-col mt-8 ml-10 flex justify-start">
          <h3 className="text-white text-lg">{localStorage.getItem('nickname') || 'Nickname'}</h3>
          <div className={'flex gap-0.5'}>
            <Badge src="https://cdn3.emoji.gg/emojis/601949-owner.png" label="GlueChat Owner" />
          </div>
        </div>

        <div className="flex h-15 flex-col w-[80%] bg-gray-900/60 rounded-md ml-[10%] mt-5 p-3">
          <label className="mb-1 font-medium text-[10px] uppercase text-gray-500">About me</label>
          <p className="text-xs italic text-gray-300">{bio || 'No description yet...'}</p>
        </div>
      </div>

      <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/5">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            Description (Bio)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-gray-700/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            placeholder="GlueChat is awesome!"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            Banner Settings
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="color"
              value={banner.startsWith('#') ? banner : '#07122b'}
              onChange={(e) => setBanner(e.target.value)}
              className="w-12 h-10 bg-transparent border-none cursor-pointer"
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleBannerFile}
              className="flex-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            Avatar Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarFile}
            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold transition-all transform active:scale-[0.98]"
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
