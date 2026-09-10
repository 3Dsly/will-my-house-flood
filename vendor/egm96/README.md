# EGM96 15-arc-minute geoid grid

`egm96-15.pgm` — geoid undulation (height of mean sea level above the WGS84
ellipsoid), 15-arc-minute resolution, 1440x721 samples.

Source: GeographicLib geoid data distribution
(https://geographiclib.sourceforge.io/C++/doc/geoid.html), which repackages the
U.S. National Geospatial-Intelligence Agency EGM96 model. EGM96 and this
repackaging are in the **public domain** (work of the U.S. government).

Used here to convert a chosen sea-level rise (metres above mean sea level) into
the ellipsoidal height CesiumJS geometry needs.
