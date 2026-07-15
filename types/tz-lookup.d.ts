/** Ambient type for the `tz-lookup` package (ships no types). Resolves an IANA
 *  timezone name (e.g. "Europe/London") from a latitude/longitude, fully offline. */
declare module 'tz-lookup' {
  const tzlookup: (latitude: number, longitude: number) => string;
  export default tzlookup;
}
