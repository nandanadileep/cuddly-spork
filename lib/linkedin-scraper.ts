import * as cheerio from 'cheerio';

export interface LinkedInProfile {
    name?: string;
    headline?: string;
    about?: string;
    location?: string;
    education?: Array<{
        school: string;
        degree?: string;
        field?: string;
        startYear?: string;
        endYear?: string;
    }>;
    experience?: Array<{
        company: string;
        title: string;
        startDate?: string;
        endDate?: string;
        description?: string;
    }>;
}

export async function scrapeLinkedInProfile(url: string): Promise<LinkedInProfile | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch LinkedIn profile: ${response.status} ${response.statusText}`);
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Basic Metadata Extraction (Most reliable for public profiles)
        const name = $('meta[property="og:title"]').attr('content') || $('title').text().split('|')[0].trim();
        const description = $('meta[property="og:description"]').attr('content');

        // Attempt to parse structured data if available (Schema.org)
        // LinkedIn sometimes puts JSON-LD in the page
        let profile: LinkedInProfile = {
            name,
            headline: description, // Often the og:description acts as the headline/summary
        };

        // Try to find JSON-LD
        $('script[type="application/ld+json"]').each((_, element) => {
            try {
                const data = JSON.parse($(element).html() || '{}');
                if (data['@type'] === 'Person') {
                    profile.name = data.name || profile.name;
                    profile.headline = data.jobTitle || profile.headline;
                    profile.location = data.address?.addressLocality;

                    if (data.worksFor) {
                        const worksFor = Array.isArray(data.worksFor) ? data.worksFor : [data.worksFor];
                        profile.experience = worksFor.map((job: any) => ({
                            company: job.name,
                            title: data.jobTitle || "Employee", // Schema might only have current job title on the person object
                        }));
                    }

                    if (data.alumniOf) {
                        const alumni = Array.isArray(data.alumniOf) ? data.alumniOf : [data.alumniOf];
                        profile.education = alumni.map((school: any) => ({
                            school: school.name || school,
                        }));
                    }
                }
            } catch (e) {
                // ignore parsing errors
            }
        });

        // Fallback Cheerio Selectors (These are brittle and break often)
        // We strive to get at least the Name and Headline reliably.

        if (!profile.name) {
            profile.name = $('h1.top-card-layout__title').text().trim();
        }
        if (!profile.headline) {
            profile.headline = $('h2.top-card-layout__headline').text().trim();
        }
        if (!profile.about) {
            profile.about = $('div.core-section-container__content.break-words').first().text().trim();
        }

        return profile;

    } catch (error) {
        console.error('Error scraping LinkedIn profile:', error);
        return null;
    }
}
