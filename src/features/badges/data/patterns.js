export const CANONICAL_FALLBACKS = {
  // Resolutions
  '4k': '(?<![a-z0-9])(?:4k|2160[pi]?|uhd(?:tv)?|3840x2160|4096x2160)(?![a-z0-9])',
  '1440p': '(?<![a-z0-9])(?:1440[pi]?|2k|2560x1440|qhd|wqhd)(?![a-z0-9])',
  '1080p': '(?<![a-z0-9])(?:1080[pi]?|1920x1080|fhd|full[-_. ]?hd)(?![a-z0-9])',
  '720p': '(?<![a-z0-9])(?:720[pi]?|1280x720|hd(?:720)?)(?![a-z0-9])',
  '576p': '(?<![a-z0-9])(?:576[pi]?)(?![a-z0-9])',
  '480p': '(?<![a-z0-9])(?:480[pi]?|sd)(?![a-z0-9])',
  '360p': '(?<![a-z0-9])(?:360[pi]?)(?![a-z0-9])',
  '240p': '(?<![a-z0-9])(?:240[pi]?)(?![a-z0-9])',
  '144p': '(?<![a-z0-9])(?:144[pi]?)(?![a-z0-9])',

  // Quality
  'remux': '(?<![a-z0-9])(?:(?:bd|uhd)[-_. ]?)?remux(?![a-z0-9])',
  'bluray': '(?<![a-z0-9])(?:bluray|blu[-_. ]?ray|bdrip|brrip|bdmux)(?![a-z0-9])',
  'web-dl': '(?<![a-z0-9])(?:web[-_. ]?dl(?:mux)?|webdl)(?![a-z0-9])',
  'webrip': '(?<![a-z0-9])(?:web[-_. ]?rip|webrip)(?![a-z0-9])',
  'hdrip': '(?<![a-z0-9])(?:hd[-_. ]?rip|hdrip)(?![a-z0-9])',
  'hc hdrip': '(?<![a-z0-9])(?:hc[-_. ]?hd[-_. ]?rip|hardcoded)(?![a-z0-9])',
  'dvdrip': '(?<![a-z0-9])(?:dvd[-_. ]?rip|dvdrip)(?![a-z0-9])',
  'hdtv': '(?<![a-z0-9])(?:hdtv|hd[-_. ]?tv)(?![a-z0-9])',
  'cam': '(?<![a-z0-9])(?:camrip|hd[-_. ]?cam|cam)(?![a-z0-9])',
  'ts': '(?<![a-z0-9])(?:telesync|hd[-_. ]?ts|ts)(?![a-z0-9])',
  'tc': '(?<![a-z0-9])(?:telecine|hd[-_. ]?tc|tc)(?![a-z0-9])',
  'scr': '(?<![a-z0-9])(?:screener|scr|dvd[-_. ]?scr)(?![a-z0-9])',

  // Visual
  'dv · hdr10+': '(?=.*?(?:dv|dolby[-_. ]?vision))(?=.*?(?:hdr10\\+|hdr10[-_. ]?plus))',
  'dv · hdr10': '(?=.*?(?:dv|dolby[-_. ]?vision))(?=.*?(?:hdr10\\b|hdr[-_. ]?10))',
  'dv · hdr': '(?=.*?(?:dv|dolby[-_. ]?vision))(?=.*?(?:hdr\\b))',
  'dv': '(?<![a-z0-9])(?:dv|dovi|dolby[-_. ]?vision)(?![a-z0-9])',
  'hdr10+': '(?<![a-z0-9])(?:hdr10\\+|hdr10[-_. ]?plus)(?![a-z0-9])',
  'hdr10': '(?<![a-z0-9])(?:hdr10\\b|hdr[-_. ]?10)(?![a-z0-9])',
  'hdr': '(?<![a-z0-9])hdr(?![a-z0-9])',
  'hlg': '(?<![a-z0-9])hlg(?![a-z0-9])',
  '10bit': '(?<![a-z0-9])10[-_. ]?bit(?![a-z0-9])',
  'sdr': '(?<![a-z0-9])sdr(?![a-z0-9])',
  'imax': '(?<![a-z0-9])imax(?:[-_. ]?enhanced)?(?![a-z0-9])',

  // Audio
  'atmos truehd': '(?=.*?(?:atmos))(?=.*?(?:true[-_. ]?hd))',
  'atmos digital+': '(?=.*?(?:atmos))(?=.*?(?:ddp|dd\\+|e[-_. ]?ac3|digital[-_. ]?plus))',
  'atmos': '(?<![a-z0-9])(?:atmos|dolby[-_. ]?atmos)(?![a-z0-9])',
  'truehd': '(?<![a-z0-9])(?:true[-_. ]?hd)(?![a-z0-9])',
  'dts:x hd ma': '(?<![a-z0-9])(?:dts[-_. ]?x[-_. ]?hd[-_. ]?ma|dts[-_. ]?x)(?![a-z0-9])',
  'dts-hd ma': '(?<![a-z0-9])(?:dts[-_. ]?hd[-_. ]?ma)(?![a-z0-9])',
  'dts:x hd': '(?<![a-z0-9])(?:dts[-_. ]?x[-_. ]?hd)(?![a-z0-9])',
  'dts-hd': '(?<![a-z0-9])dts[-_. ]?hd(?![a-z0-9])',
  'dts:x': '(?<![a-z0-9])dts[-_. ]?x(?![a-z0-9])',
  'dts': '(?<![a-z0-9])dts(?![a-z0-9])',
  'dd+': '(?<![a-z0-9])(?:dd\\+|ddp|e[-_. ]?ac[-_. ]?3|dolby[-_. ]?digital[-_. ]?plus)(?![a-z0-9])',
  'dd': '(?<![a-z0-9])(?:dd|ac[-_. ]?3|dolby[-_. ]?digital)(?![a-z0-9])',
  'aac': '(?<![a-z0-9])aac(?![a-z0-9])',
  'flac': '(?<![a-z0-9])flac(?![a-z0-9])',
  'opus': '(?<![a-z0-9])opus(?![a-z0-9])',

  // Channels
  '7.1': '(?<![0-9])7[._ ]1(?:ch)?(?![0-9])',
  '6.1': '(?<![0-9])6[._ ]1(?:ch)?(?![0-9])',
  '5.1': '(?<![0-9])5[._ ]1(?:ch)?(?![0-9])',
  '2.0': '(?<![0-9])2[._ ]0(?:ch)?(?![0-9])',

  // Codecs / Encoders
  'av1': '(?<![a-z0-9])av1(?![a-z0-9])',
  'hevc': '(?<![a-z0-9])(?:hevc|h[-_. ]?265|x265)(?![a-z0-9])',
  'avc': '(?<![a-z0-9])(?:avc|h[-_. ]?264|x264)(?![a-z0-9])'
};

export const CANONICAL_LATINO_PATTERN = '(?i)(?<![^\\s\\[(_\\-.,])(latino|lat|latam|es[-_.]?(?:mx|la|419)|audio[ .\\-_]?latino)(?![ .\\-_]?sub(title)?s?)(?=[\\s\\)\\]_.\\-,]|$)';
