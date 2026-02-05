import { IconType } from 'react-icons'
import {
    MdCode,
    MdPalette,
    MdWeb,
    MdInventory2,
    MdEditNote,
    MdScience,
    MdSportsEsports,
    MdGroups,
    MdRocketLaunch,
    MdVideoLibrary,
    MdEmojiEvents,
} from 'react-icons/md'
import {
    SiGithub, SiGitlab, SiBitbucket, SiSourceforge,
    SiDribbble, SiBehance, SiFramer, SiFigma, SiArtstation, SiAwwwards,
    SiCodepen, SiCodesandbox, SiStackblitz, SiJsfiddle, SiReplit, SiGlitch,
    SiNpm, SiPypi, SiRubygems, SiApachemaven, SiPackagist, SiNuget,
    SiMedium, SiDevdotto, SiHashnode, SiSubstack, SiHackernoon, SiFreecodecamp,
    SiKaggle, SiHuggingface, SiJupyter,
    SiItchdotio, SiUnity,
    SiLinkedin, SiX, SiWellfound,
    SiProducthunt, SiIndiehackers,
    SiYoutube, SiVimeo, SiTwitch, SiPodcastaddict,
    SiLeetcode, SiHackerrank, SiCodechef, SiCodeforces, SiTopcoder
} from 'react-icons/si'

export interface Platform {
    id: string
    name: string
    icon: IconType
    color: string
}

export interface PlatformCategory {
    name: string
    icon: IconType
    platforms: Platform[]
}

export const PLATFORM_CATEGORIES: PlatformCategory[] = [
    {
        name: 'Code Repositories',
        icon: MdCode,
        platforms: [
            { id: 'github', name: 'GitHub', icon: SiGithub, color: '#181717' },
            { id: 'gitlab', name: 'GitLab', icon: SiGitlab, color: '#FC6D26' },
            { id: 'bitbucket', name: 'Bitbucket', icon: SiBitbucket, color: '#0052CC' },
            { id: 'sourceforge', name: 'SourceForge', icon: SiSourceforge, color: '#EE7600' },
        ]
    },
    {
        name: 'Design & Creative',
        icon: MdPalette,
        platforms: [
            { id: 'dribbble', name: 'Dribbble', icon: SiDribbble, color: '#EA4C89' },
            { id: 'behance', name: 'Behance', icon: SiBehance, color: '#1769FF' },
            { id: 'framer', name: 'Framer', icon: SiFramer, color: '#0055FF' },
            { id: 'figma', name: 'Figma', icon: SiFigma, color: '#F24E1E' },
            { id: 'artstation', name: 'ArtStation', icon: SiArtstation, color: '#13AFF0' },
            { id: 'awwwards', name: 'Awwwards', icon: SiAwwwards, color: '#1A1818' },
        ]
    },
    {
        name: 'Frontend Playgrounds',
        icon: MdWeb,
        platforms: [
            { id: 'codepen', name: 'CodePen', icon: SiCodepen, color: '#000000' },
            { id: 'codesandbox', name: 'CodeSandbox', icon: SiCodesandbox, color: '#151515' },
            { id: 'stackblitz', name: 'StackBlitz', icon: SiStackblitz, color: '#1389FD' },
            { id: 'jsfiddle', name: 'JSFiddle', icon: SiJsfiddle, color: '#464646' },
            { id: 'replit', name: 'Replit', icon: SiReplit, color: '#F26202' },
            { id: 'glitch', name: 'Glitch', icon: SiGlitch, color: '#3333FF' },
        ]
    },
    {
        name: 'Package Registries',
        icon: MdInventory2,
        platforms: [
            { id: 'npm', name: 'npm', icon: SiNpm, color: '#CB3837' },
            { id: 'pypi', name: 'PyPI', icon: SiPypi, color: '#3775A9' },
            { id: 'rubygems', name: 'RubyGems', icon: SiRubygems, color: '#E9573F' },
            { id: 'maven', name: 'Maven Central', icon: SiApachemaven, color: '#C71A36' },
            { id: 'packagist', name: 'Packagist', icon: SiPackagist, color: '#F28D1A' },
            { id: 'nuget', name: 'NuGet', icon: SiNuget, color: '#004880' },
        ]
    },
    {
        name: 'Technical Writing',
        icon: MdEditNote,
        platforms: [
            { id: 'medium', name: 'Medium', icon: SiMedium, color: '#000000' },
            { id: 'devto', name: 'Dev.to', icon: SiDevdotto, color: '#0A0A0A' },
            { id: 'hashnode', name: 'Hashnode', icon: SiHashnode, color: '#2962FF' },
            { id: 'substack', name: 'Substack', icon: SiSubstack, color: '#FF6719' },
            { id: 'hackernoon', name: 'Hacker Noon', icon: SiHackernoon, color: '#02D35F' },
            { id: 'freecodecamp', name: 'freeCodeCamp', icon: SiFreecodecamp, color: '#0A0A23' },
        ]
    },
    {
        name: 'Data Science & ML',
        icon: MdScience,
        platforms: [
            { id: 'kaggle', name: 'Kaggle', icon: SiKaggle, color: '#20BEFF' },
            { id: 'huggingface', name: 'Hugging Face', icon: SiHuggingface, color: '#FFD21E' },
            { id: 'jupyter', name: 'Jupyter', icon: SiJupyter, color: '#F37626' },
        ]
    },
    {
        name: 'Game Development',
        icon: MdSportsEsports,
        platforms: [
            { id: 'itchio', name: 'itch.io', icon: SiItchdotio, color: '#FA5C5C' },
            { id: 'unity', name: 'Unity', icon: SiUnity, color: '#000000' },
        ]
    },
    {
        name: 'Professional Networks',
        icon: MdGroups,
        platforms: [
            { id: 'twitter', name: 'Twitter/X', icon: SiX, color: '#000000' },
            { id: 'wellfound', name: 'Wellfound', icon: SiWellfound, color: '#CC2127' },
        ]
    },
    {
        name: 'Product Launches',
        icon: MdRocketLaunch,
        platforms: [
            { id: 'producthunt', name: 'Product Hunt', icon: SiProducthunt, color: '#DA552F' },
            { id: 'indiehackers', name: 'Indie Hackers', icon: SiIndiehackers, color: '#0E2439' },
        ]
    },
    {
        name: 'Content Creation',
        icon: MdVideoLibrary,
        platforms: [
            { id: 'youtube', name: 'YouTube', icon: SiYoutube, color: '#FF0000' },
            { id: 'vimeo', name: 'Vimeo', icon: SiVimeo, color: '#1AB7EA' },
            { id: 'twitch', name: 'Twitch', icon: SiTwitch, color: '#9146FF' },
            { id: 'podcast', name: 'Podcasts', icon: SiPodcastaddict, color: '#F48E36' },
        ]
    },
    {
        name: 'Competitive Coding',
        icon: MdEmojiEvents,
        platforms: [
            { id: 'leetcode', name: 'LeetCode', icon: SiLeetcode, color: '#FFA116' },
            { id: 'hackerrank', name: 'HackerRank', icon: SiHackerrank, color: '#00EA64' },
            { id: 'codechef', name: 'CodeChef', icon: SiCodechef, color: '#5B4638' },
            { id: 'codeforces', name: 'Codeforces', icon: SiCodeforces, color: '#1F8ACB' },
            { id: 'topcoder', name: 'TopCoder', icon: SiTopcoder, color: '#29A7DF' },
        ]
    }
]

// Helper to get all platforms flattened
export const getAllPlatforms = (): Platform[] => {
    return PLATFORM_CATEGORIES.flatMap(category => category.platforms)
}

// Helper to find a platform by ID
export const getPlatformById = (id: string): Platform | undefined => {
    return getAllPlatforms().find(platform => platform.id === id)
}
