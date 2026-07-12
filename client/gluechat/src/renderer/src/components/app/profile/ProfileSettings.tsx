import { useState, ChangeEvent, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {Badge} from "@renderer/components/app/profile/Badge"
import { validateOrRefreshToken } from '@renderer/assets/main'
import { jwtDecode } from 'jwt-decode'
import { API_BASE_URL } from '@renderer/assets/utils'
import { FaTrash } from "react-icons/fa6";

interface ProfileSettingsProps {
  authToken: string | null
}

export function ProfileSettings({authToken}: ProfileSettingsProps) {
  const [bio, setBio] = useState( "");
  const [avatar, setAvatar] = useState("");
  const [bannerColor, setBannerColor] = useState('#0d1935')
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [badges, setBadges] = useState<{ id: string; name: string; imageUrl: string }[]>([]);

  const queryClient = useQueryClient()

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>("Successfully updated profile!");
  useEffect(() => {
    const fetchProfile = async () => {
      if (!authToken)  {
        return
      }
      try {
        const authKey = await validateOrRefreshToken(authToken)
        const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
          headers: {
            Authorization: `Bearer ${authKey}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data) {
            setBio(data.description || '')
            setBadges(data.badges || [])


            const decoded: any = jwtDecode(authKey)
            if (data.avatarUrl)
              setAvatar(`${API_BASE_URL}/api/profile/assets/avatar/${decoded.id}`)
            if (data.bannerColor) {
              setBannerColor(data.bannerColor)
            }
            if (data.bannerUrl)
              setBannerPreview(`${API_BASE_URL}/api/profile/assets/banner/${decoded.id}`)
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile', err)
      }
    }
    fetchProfile()
  }, [authToken])

  const changeBannerColor = (e) => {
    setBannerPreview(null);
    setBannerColor(e)
  }



  const handleBannerFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBannerFile(file);
      const reader = new FileReader()
      reader.onloadend = () => {
        setBannerPreview(reader.result as string)
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

  const handleRemoveBanner =  async () => {
    const decoded: any = jwtDecode(authToken as string);
     const response = await fetch(`${API_BASE_URL}/api/profile/assets/banner/${decoded.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })

    if (response.ok) {
      setBannerPreview('')
      setBannerFile(null)
      setSuccess(true)
      setSuccessMessage('Successfully removed banner!')
      setTimeout(() => setSuccess(false), 2000);
    } else {
      setBannerFile(null)
      setBannerPreview(null)
      setBannerColor('#0d1935')
    }
  }

  const handleRemoveAvatar = async () => {
    const decoded: any = jwtDecode(authToken as string)
    const response = await fetch(`${API_BASE_URL}/api/profile/assets/avatar/${decoded.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })
    if (response.ok) {
      setAvatar("");
      setAvatarFile(null);
      setSuccess(true)
      setSuccessMessage("Successfully removed profile!");
      setTimeout(() => setSuccess(false), 2000)
    } else {
      setAvatarFile(null);
      setAvatar("");
    }
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(false)

    try {
      const authKey: string = await validateOrRefreshToken(authToken as string)
      const formData = new FormData()

      if (avatarFile) formData.append('avatar', avatarFile)
      formData.append('bannerColor', bannerColor)
      if (bannerFile) {
        formData.append('banner', bannerFile)
      }
      formData.append('description', bio)

      const response = await fetch(`${API_BASE_URL}/api/profile/update`, {
        headers: { Authorization: `Bearer ${authKey}` },
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "Something went wrong")
      }

      setSuccess(true);
      setSuccessMessage('Successfully updated profile!');
      setAvatarFile(null)
      setBannerFile(null)
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] })

    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="p-8 w-full   mx-auto space-y-8 overflow-y-auto h-full [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-violet-950/50 [&::-webkit-scrollbar-thumb]:rounded-full">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-white">Account</h2>
        <p className="text-gray-500 text-sm mt-1">Manage your account information</p>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-4 rounded-xl text-sm font-medium">
          {successMessage}
        </div>
      )}
      <div className="relative h-120 rounded-2xl   bg-gray-900/40 overflow-hidden border border-white/10 shadow-2xl">
        <div
          className="h-35 w-full"
          style={{
            backgroundColor: bannerColor,
            backgroundImage: bannerPreview ? `url(${bannerPreview})` : 'none',
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
              </div>
            </div>
          </div>
        </div>

        <div className="font-bold  flex-col mt-8 ml-10 flex justify-start">
          <h3 className="text-white text-lg">{localStorage.getItem('nickname') || 'Nickname'}</h3>
          <div className={'flex gap-0.5'}>
            {badges.map((badge) => (
              <Badge key={badge.id} src={badge.imageUrl} label={badge.name} />
            ))}
          </div>
        </div>

        <div className="flex flex-col w-[90%] bg-gray-950/40 rounded-xl mx-auto mt-6 p-4 border overflow-y-auto border-white/5">
          <label className="mb-2 font-bold text-[10px] uppercase text-gray-500 tracking-wider">
            About me
          </label>
          <p className="text-sm text-gray-300 break-all leading-relaxed">
            {bio || 'This user has no bio yet.'}
          </p>
        </div>
      </div>
      <div className="space-y-6  bg-white/5 p-6 rounded-2xl border border-white/5">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            Description (Bio)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-gray-700/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-2 resize-none focus:ring-violet-500 outline-none transition-all"
            placeholder="GlueChat is awesome!"
            maxLength={180}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            Banner Settings
          </label>
          <div className="flex gap-4 items-center">
            {bannerPreview && (
              <button
                onClick={handleRemoveBanner}
                title="Delete banner"
                className=" p-1 flex items-center relative w-6 h-6  rounded-md bg-red-400 gap-2"
              >
                <FaTrash size={16} className={'absolute'} />
              </button>
            )}

            <input
              type="color"
              value={bannerColor}
              onChange={(e) => changeBannerColor(e.target.value)}
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
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Avatar Image</label>
        <div className={'flex gap-4 items-center'}>
          {avatar && (
            <button
              title="Delete avatar"
              onClick={handleRemoveAvatar}
              className=" p-1 flex items-center relative w-6 h-6  rounded-md bg-red-400 gap-2"
            >
              <FaTrash size={16} className={'absolute'} />
            </button>
          )}
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
