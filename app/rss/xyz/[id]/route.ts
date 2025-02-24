import type { NextRequest } from "next/server"
import rss from "rss"
import { requestNextData } from "@/app/xyz-tools"

export async function generateStaticParams() {
  return []
}

const SELF_URL = process.env.SELF_URL

interface Episode {
  id: string
  title: string
  description: string
  published_at: string
  audio_url: string
}

interface Podcast {
  title: string
  description: string
  author: string
  logo_url: string
}

interface PodcastData {
  podcast: Podcast
  episodes: Episode[]
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  console.log("Generate Xiaoyuzhou RSS for podcast id:", params.id)

  const link = `https://www.xiaoyuzhoufm.com/podcast/${params.id}`

  const res = await requestNextData<PodcastData>(link)

  if (!res.ok) {
    return new Response(null, {
      status: res.status,
      statusText: res.statusText,
    })
  }

  const podcastData = res.data

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
    pubDate: new Date(podcastData.episodes[0].published_at),
    ttl: 60,
  })

  podcastData.episodes.forEach((episode: Episode) => {
    feed.item({
      title: episode.title,
      description: episode.description,
      url: `https://www.xiaoyuzhoufm.com/episodes/${episode.id}`,
      guid: episode.id,
      author: podcastData.podcast.author,
      date: new Date(episode.published_at),
      enclosure: {
        url: episode.audio_url,
        type: "audio/mpeg",
      },
    })
  })

  return new Response(feed.xml({ indent: true }), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  })
}


