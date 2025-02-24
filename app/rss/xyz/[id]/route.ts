import type { NextRequest } from "next/server"
import rss from "rss"
import { requestNextData } from "@/app/xyz-tools"

// Remove the revalidate export, we'll handle this differently
// export const revalidate = 3600;

// This function is crucial for ISR with dynamic routes
export async function generateStaticParams() {
  // Ideally, you should return an array of all possible `id` values
  // For example: return [{ id: '1' }, { id: '2' }, ...]
  // If you can't predict all IDs, return an empty array
  return []
}

const SELF_URL = process.env.SELF_URL

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  console.log("Generate Xiaoyuzhou RSS for podcast id:", params.id)

  const link = `https://www.xiaoyuzhoufm.com/podcast/${params.id}`

  const res = await requestNextData(link)

  if (!res.ok) {
    return new Response(null, {
      status: res.status,
      statusText: res.statusText,
    })
  }

  const podcastData = await res.json()

  const feed = new rss({
    title: podcastData.podcast.title,
    description: podcastData.podcast.description,
    feed_url: `${SELF_URL}/rss/xyz/${params.id}`,
    site_url: `https://www.xiaoyuzhoufm.com/podcast/${params.id}`,
    image_url: podcastData.podcast.logo_url,
    managingEditor: podcastData.podcast.author,
    webMaster: podcastData.podcast.author,
    copyright: podcastData.podcast.author,
    language: "zh-cn",
    pubDate: podcastData.episodes[0].published_at,
    ttl: 60,
  })

  podcastData.episodes.forEach((episode: any) => {
    feed.item({
      title: episode.title,
      description: episode.description,
      url: `https://www.xiaoyuzhoufm.com/episodes/${episode.id}`,
      guid: episode.id,
      author: podcastData.podcast.author,
      date: episode.published_at,
      enclosure: {
        url: episode.audio_url,
        type: "audio/mpeg",
      },
    })
  })

  // At the end, return the response with a revalidate option
  return new Response(feed.xml({ indent: true }), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
    status: 200,
    statusText: "OK",
  })
}

