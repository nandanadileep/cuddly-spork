'use client'

import { useState } from 'react'
import { MdKeyboardArrowDown, MdKeyboardArrowUp, MdCheck } from 'react-icons/md'
import { PLATFORM_CATEGORIES } from '@/lib/constants/platforms'

interface PlatformSelectorProps {
    selectedPlatforms: string[]
    onPlatformToggle: (platformId: string) => void
    defaultOpenCategory?: string
}

export default function PlatformSelector({
    selectedPlatforms,
    onPlatformToggle,
    defaultOpenCategory = 'Code Repositories'
}: PlatformSelectorProps) {
    const [openCategory, setOpenCategory] = useState<string | null>(defaultOpenCategory)

    const toggleCategory = (name: string) => {
        setOpenCategory(openCategory === name ? null : name)
    }

    return (
        <div className="space-y-px bg-[var(--border-light)] border border-[var(--border-light)] rounded-lg overflow-hidden">
            {PLATFORM_CATEGORIES.map((category) => (
                <div key={category.name} className="bg-[var(--bg-card)]">
                    <button
                        onClick={() => toggleCategory(category.name)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-light)] transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl opacity-70 group-hover:opacity-100 transition-opacity">
                                {category.icon}
                            </span>
                            <span className="font-medium text-[var(--text-primary)]">
                                {category.name}
                            </span>
                            {category.platforms.some(p => selectedPlatforms.includes(p.id)) && (
                                <span className="text-xs ml-2 bg-[var(--green-light)] text-[var(--github-green)] px-2 py-0.5 rounded-full font-medium">
                                    {category.platforms.filter(p => selectedPlatforms.includes(p.id)).length} selected
                                </span>
                            )}
                        </div>
                        <div className="text-[var(--text-secondary)]">
                            {openCategory === category.name ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
                        </div>
                    </button>

                    {openCategory === category.name && (
                        <div className="px-6 pb-6 pt-2 bg-[var(--bg-light)]/30 border-t border-[var(--border-light)]">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
                                {category.platforms.map((platform) => {
                                    const isSelected = selectedPlatforms.includes(platform.id)
                                    return (
                                        <button
                                            key={platform.id}
                                            onClick={() => onPlatformToggle(platform.id)}
                                            className={`
                                                flex flex-col items-center justify-center gap-2 p-3 rounded-md border transition-all relative
                                                ${isSelected
                                                    ? 'border-[var(--orange-primary)] bg-white shadow-sm'
                                                    : 'border-transparent hover:bg-white hover:shadow-sm'}
                                            `}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 text-[var(--orange-primary)] text-xs">
                                                    <MdCheck />
                                                </div>
                                            )}
                                            <platform.icon
                                                className={`text-2xl transition-all ${isSelected ? '' : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'}`}
                                                style={{ color: isSelected ? platform.color : undefined }}
                                            />
                                            <span className={`text-xs ${isSelected ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                {platform.name}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
