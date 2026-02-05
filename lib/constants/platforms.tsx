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
    fetches: string[]
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
            { id: 'github', name: 'GitHub', icon: SiGithub, color: '#181717', fetches: ['Repositories', 'README', 'Languages', 'Stars'] },
            { id: 'gitlab', name: 'GitLab', icon: SiGitlab, color: '#FC6D26', fetches: ['Repositories', 'README', 'Languages'] },
            { id: 'bitbucket', name: 'Bitbucket', icon: SiBitbucket, color: '#0052CC', fetches: ['Repositories', 'README', 'Languages'] },
            { id: 'sourceforge', name: 'SourceForge', icon: SiSourceforge, color: '#EE7600', fetches: ['Projects', 'README'] },
        ]
    },
    {
        name: 'Design & Creative',
        icon: MdPalette,
        platforms: [
            { id: 'dribbble', name: 'Dribbble', icon: SiDribbble, color: '#EA4C89', fetches: ['Shots', 'Tags', 'Likes'] },
            { id: 'behance', name: 'Behance', icon: SiBehance, color: '#1769FF', fetches: ['Projects', 'Fields', 'Appreciations'] },
            { id: 'framer', name: 'Framer', icon: SiFramer, color: '#0055FF', fetches: ['Published Work'] },
            { id: 'figma', name: 'Figma', icon: SiFigma, color: '#F24E1E', fetches: ['Published Files'] },
            { id: 'artstation', name: 'ArtStation', icon: SiArtstation, color: '#13AFF0', fetches: ['Projects', 'Tags'] },
            { id: 'awwwards', name: 'Awwwards', icon: SiAwwwards, color: '#1A1818', fetches: ['Awards', 'Projects'] },
        ]
    },
    {
        name: 'Frontend Playgrounds',
        icon: MdWeb,
        platforms: [
            { id: 'codepen', name: 'CodePen', icon: SiCodepen, color: '#000000', fetches: ['Pens', 'Tags', 'Hearts'] },
            { id: 'codesandbox', name: 'CodeSandbox', icon: SiCodesandbox, color: '#151515', fetches: ['Sandboxes'] },
            { id: 'stackblitz', name: 'StackBlitz', icon: SiStackblitz, color: '#1389FD', fetches: ['Projects'] },
            { id: 'jsfiddle', name: 'JSFiddle', icon: SiJsfiddle, color: '#464646', fetches: ['Fiddles'] },
            { id: 'replit', name: 'Replit', icon: SiReplit, color: '#F26202', fetches: ['Repls'] },
            { id: 'glitch', name: 'Glitch', icon: SiGlitch, color: '#3333FF', fetches: ['Projects'] },
        ]
    },
    {
        name: 'Package Registries',
        icon: MdInventory2,
        platforms: [
            { id: 'npm', name: 'npm', icon: SiNpm, color: '#CB3837', fetches: ['Packages', 'Downloads', 'Keywords'] },
            { id: 'pypi', name: 'PyPI', icon: SiPypi, color: '#3775A9', fetches: ['Packages', 'Downloads', 'Keywords'] },
            { id: 'rubygems', name: 'RubyGems', icon: SiRubygems, color: '#E9573F', fetches: ['Gems', 'Downloads'] },
            { id: 'maven', name: 'Maven Central', icon: SiApachemaven, color: '#C71A36', fetches: ['Artifacts', 'Versions'] },
            { id: 'packagist', name: 'Packagist', icon: SiPackagist, color: '#F28D1A', fetches: ['Packages', 'Downloads'] },
            { id: 'nuget', name: 'NuGet', icon: SiNuget, color: '#004880', fetches: ['Packages', 'Downloads'] },
        ]
    },
    {
        name: 'Technical Writing',
        icon: MdEditNote,
        platforms: [
            { id: 'medium', name: 'Medium', icon: SiMedium, color: '#000000', fetches: ['Posts', 'Tags', 'Claps'] },
            { id: 'devto', name: 'Dev.to', icon: SiDevdotto, color: '#0A0A0A', fetches: ['Posts', 'Tags', 'Reactions'] },
            { id: 'hashnode', name: 'Hashnode', icon: SiHashnode, color: '#2962FF', fetches: ['Posts', 'Tags'] },
            { id: 'substack', name: 'Substack', icon: SiSubstack, color: '#FF6719', fetches: ['Posts', 'Sections'] },
            { id: 'hackernoon', name: 'Hacker Noon', icon: SiHackernoon, color: '#02D35F', fetches: ['Stories', 'Tags'] },
            { id: 'freecodecamp', name: 'freeCodeCamp', icon: SiFreecodecamp, color: '#0A0A23', fetches: ['Posts', 'Topics'] },
        ]
    },
    {
        name: 'Data Science & ML',
        icon: MdScience,
        platforms: [
            { id: 'kaggle', name: 'Kaggle', icon: SiKaggle, color: '#20BEFF', fetches: ['Competitions', 'Datasets', 'Kernels'] },
            { id: 'huggingface', name: 'Hugging Face', icon: SiHuggingface, color: '#FFD21E', fetches: ['Models', 'Spaces', 'Datasets'] },
            { id: 'jupyter', name: 'Jupyter', icon: SiJupyter, color: '#F37626', fetches: ['Manual link'] },
        ]
    },
    {
        name: 'Game Development',
        icon: MdSportsEsports,
        platforms: [
            { id: 'itchio', name: 'itch.io', icon: SiItchdotio, color: '#FA5C5C', fetches: ['Games', 'Tags'] },
            { id: 'unity', name: 'Unity', icon: SiUnity, color: '#000000', fetches: ['Packages', 'Demos'] },
        ]
    },
    {
        name: 'Professional Networks',
        icon: MdGroups,
        platforms: [
            { id: 'twitter', name: 'Twitter/X', icon: SiX, color: '#000000', fetches: ['Profile', 'Pinned post', 'Followers'] },
            { id: 'wellfound', name: 'Wellfound', icon: SiWellfound, color: '#CC2127', fetches: ['Profile', 'Roles'] },
        ]
    },
    {
        name: 'Product Launches',
        icon: MdRocketLaunch,
        platforms: [
            { id: 'producthunt', name: 'Product Hunt', icon: SiProducthunt, color: '#DA552F', fetches: ['Launches', 'Upvotes', 'Topics'] },
            { id: 'indiehackers', name: 'Indie Hackers', icon: SiIndiehackers, color: '#0E2439', fetches: ['Projects', 'Posts'] },
        ]
    },
    {
        name: 'Content Creation',
        icon: MdVideoLibrary,
        platforms: [
            { id: 'youtube', name: 'YouTube', icon: SiYoutube, color: '#FF0000', fetches: ['Videos', 'Views', 'Subscribers'] },
            { id: 'vimeo', name: 'Vimeo', icon: SiVimeo, color: '#1AB7EA', fetches: ['Videos', 'Plays'] },
            { id: 'twitch', name: 'Twitch', icon: SiTwitch, color: '#9146FF', fetches: ['Streams', 'Followers'] },
            { id: 'podcast', name: 'Podcasts', icon: SiPodcastaddict, color: '#F48E36', fetches: ['Episodes', 'Plays'] },
        ]
    },
    {
        name: 'Competitive Coding',
        icon: MdEmojiEvents,
        platforms: [
            { id: 'leetcode', name: 'LeetCode', icon: SiLeetcode, color: '#FFA116', fetches: ['Rating', 'Solved', 'Badges'] },
            { id: 'hackerrank', name: 'HackerRank', icon: SiHackerrank, color: '#00EA64', fetches: ['Rating', 'Badges'] },
            { id: 'codechef', name: 'CodeChef', icon: SiCodechef, color: '#5B4638', fetches: ['Rating', 'Contests'] },
            { id: 'codeforces', name: 'Codeforces', icon: SiCodeforces, color: '#1F8ACB', fetches: ['Rating', 'Contests'] },
            { id: 'topcoder', name: 'TopCoder', icon: SiTopcoder, color: '#29A7DF', fetches: ['Rating', 'Challenges'] },
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
