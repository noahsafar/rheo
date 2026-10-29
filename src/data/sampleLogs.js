// Synthetic work entries so the work log, entry pages and filters have something to show.
// Like everything else in the demo, the people and results are invented.
// [owner, date, invention, type, outcome, what I did, result, process used, time it took, who can see it (default: lab)]

const rows = [
  // Elena Marsh (PI)
  ['m1', '2026-10-27', 'inv1', 'experiment', 'worked', 'Reviewed day-21 release curves with Daniel', 'Release is linear through day 21; plateau is not yet visible', 'Compared against the v5 loading protocol curves', '1 h'],
  ['m1', '2026-10-24', 'inv2', 'idea', 'unclear', 'Idea: add a second channel for sweat rate so lactate can be normalized', '', '', '', 'private'],
  ['m1', '2026-10-21', 'inv1', 'experiment', 'partly', 'Ran knockdown qPCR on day-14 supernatant-treated cells', 'About 55% GAPDH knockdown; one replicate failed QC', 'qPCR, ΔΔCt against scrambled siRNA', 'Half day'],
  ['m1', '2026-10-17', 'inv2', 'note', '', 'Met with Tom about the on-body pilot', 'Agreed to wait for the new adhesive before recruiting', '', '30 min', 'pi'],
  ['m1', '2026-10-14', 'inv1', 'protocol', 'worked', 'Changed release sampling from every 3 days to every 2 days', 'Smoother curve, less risk of missing the burst', '', '15 min'],
  ['m1', '2026-10-09', 'inv1', 'experiment', 'failed', 'Tried gelation at 18% w/v to slow release', 'Gel set at room temperature, too stiff to inject', 'Tube inversion at 25 and 37 °C', '2 h'],
  ['m1', '2026-10-03', 'inv2', 'experiment', 'worked', 'Checked lactate calibration on Ji-woo’s new paper batch', 'Linear from 2 to 25 mM, R² 0.98', 'Smartphone colorimetry, 6 standards in triplicate', '1 h'],
  ['m1', '2026-09-29', 'inv1', 'note', '', 'Read the 2025 thermogel review for prior art', 'Two groups load siRNA after gelation; ours loads before', '', '2 h'],
  ['m1', '2026-09-23', 'inv1', 'experiment', 'worked', 'Repeated MTT viability at 48 h with the 16% gel', 'Viability above 90% at all doses', 'MTT, HeLa, 3 replicates', 'Half day'],
  ['m1', '2026-09-16', 'inv2', 'idea', '', 'Idea: print the lactate oxidase layer instead of drop-casting it', '', '', ''],
  ['m1', '2026-09-10', 'inv1', 'experiment', 'partly', 'Spot-checked siRNA integrity after 7 days in gel', 'Mostly intact band, faint smear', 'Agarose gel electrophoresis', '2 h'],
  ['m1', '2026-09-02', 'inv2', 'note', '', 'Ordered lactate oxidase and new PET film', '', '', '15 min'],
  ['m1', '2026-08-26', 'inv1', 'experiment', 'worked', 'Made a fresh 16% w/v triblock stock', 'Clear solution, gels at 34 °C', 'Cold dissolution overnight at 4 °C', '1 h'],
  // Daniel Osei (postdoc, siRNA hydrogel)
  ['m2', '2026-09-26', 'inv1', 'note', '', 'Presented release data on a poster at the department retreat', 'Showed the day-14 release curve; the gel recipe was not on the poster', '', 'Half day'],
  ['m2', '2026-10-27', 'inv1', 'experiment', 'worked', 'Release assay on batch 14, day 21', '62% cumulative release, up from 58% on day 18', 'RiboGreen, 3 replicates, 37 °C shaker', '2 h'],
  ['m2', '2026-10-20', 'inv1', 'experiment', 'worked', 'Rheology on batch 14 across 20–40 °C', 'Gel point at 33.5 °C, G′ plateau 1.2 kPa', 'Temperature sweep, 1 Hz, 1% strain', 'Half day'],
  ['m2', '2026-10-13', 'inv1', 'experiment', 'failed', 'Loaded siRNA at N/P 15 to raise payload', 'Polyplexes aggregated, gel turned cloudy', 'siRNA loading v5 with higher PEI', '3 h'],
  ['m2', '2026-10-06', 'inv1', 'experiment', 'worked', 'Started release study on batch 14', '', 'RiboGreen, sampling every 3 days', '1 h'],
  ['m2', '2026-09-30', 'inv1', 'protocol', 'worked', 'Switched dialysis membrane to 3.5 kDa cutoff', 'Less polymer loss into the buffer', '', '30 min'],
  ['m2', '2026-09-22', 'inv1', 'experiment', 'partly', 'Injected gel through 27 G needle', 'Worked at 4 °C, clogged once it warmed above 20 °C', 'Syringe kept on ice', '1 h'],
  ['m2', '2026-09-15', 'inv1', 'experiment', 'worked', 'Synthesized PEG-PLGA-PEG batch 14', 'Yield 71%, Mn 5.8 kDa by NMR', 'Ring-opening polymerization, 24 h', 'Full day'],
  ['m2', '2026-09-08', 'inv1', 'note', '', 'Wrote up the handoff notes for the gel synthesis', '', '', '2 h', 'pi'],
  // Carlos Vega (technician, siRNA hydrogel)
  ['m6', '2026-10-12', 'inv2', 'experiment', 'worked', 'Made lactate calibration standards for Ji-woo', '6 standards, 2 to 25 mM, checked by enzyme kit', 'Serial dilution in artificial sweat', '1 h'],
  ['m6', '2026-10-23', 'inv1', 'experiment', 'worked', 'Ran RiboGreen standards for the release plate', 'Standard curve R² 0.995', 'RiboGreen, 8-point curve', '1 h'],
  ['m6', '2026-10-16', 'inv1', 'experiment', 'failed', 'Plate reader calibration for fluorescence', 'Gain drifted, had to repeat', '', '30 min'],
  ['m6', '2026-10-02', 'inv1', 'protocol', 'worked', 'Updated the cell-seeding SOP to 10k cells per well', '', '', '30 min'],
  ['m6', '2026-09-18', 'inv1', 'experiment', 'worked', 'Passaged HeLa cells for MTT', 'Passage 12, 85% confluent', 'Standard passaging', '1 h'],
  // Tom Brandt (PhD student, sweat lactate patch)
  ['m4', '2026-09-30', 'inv2', 'note', '', 'Used adhesive samples sent by a medical tape supplier', 'They asked us to sign a sample agreement', '', '15 min'],
  ['m4', '2026-10-28', 'inv2', 'experiment', 'partly', 'Tested new medical adhesive on forearm for 4 h', 'Held for 3 h, lifted at one edge during exercise', 'Volunteer self-test, cycling 30 min', 'Half day'],
  ['m4', '2026-10-22', 'inv2', 'experiment', 'worked', 'Laser-cut channel layer v7', 'Channels 200 µm wide, clean edges', 'CO₂ laser, 12% power, 3 passes', '2 h'],
  ['m4', '2026-10-15', 'inv2', 'experiment', 'failed', 'Bonded PET to PDMS with plasma treatment', 'Delaminated after 10 min in buffer', 'Plasma 60 s, pressed 1 h', '3 h'],
  ['m4', '2026-10-08', 'inv2', 'protocol', 'worked', 'Changed to double-sided adhesive instead of plasma bonding', 'No leaks at 20 µL/min', '', '1 h'],
  ['m4', '2026-10-01', 'inv2', 'experiment', 'worked', 'Flow test on channel v6 with dyed buffer', 'Fill time 4 min, no bubbles', 'Syringe pump, 5 µL/min', '1 h'],
  ['m4', '2026-09-24', 'inv2', 'idea', '', 'Idea: a wicking pad at the outlet so the patch never saturates', '', '', '', 'pi'],
  ['m4', '2026-09-17', 'inv2', 'experiment', 'unclear', 'Compared lactate signal with and without the PVA layer', 'Signal slightly higher with PVA, needs more runs', 'Smartphone colorimetry, n=3', '2 h'],
  ['m4', '2026-09-09', 'inv2', 'note', '', 'Drafted the IRB amendment for the on-body pilot', '', '', '3 h', 'pi'],
  // Ji-woo Park (PhD student, sweat lactate patch)
  ['m8', '2026-10-25', 'inv2', 'note', '', 'Drafted a conference abstract on the paper lactate sensor', 'Due Feb 1 for the spring biosensors conference', '', '3 h'],
  ['m8', '2026-10-26', 'inv2', 'experiment', 'worked', 'Made paper sensor batch 9', '40 sensors, all passed visual check', 'Wax printing, 120 °C bake, enzyme drop-cast', 'Half day'],
  ['m8', '2026-10-19', 'inv2', 'experiment', 'partly', 'Shelf-life test at 4 °C, week 3', 'Signal down 12% from week 0', 'Same standards as week 0', '1 h', 'private'],
  ['m8', '2026-10-05', 'inv2', 'experiment', 'worked', 'Calibration curve for batch 8', 'Linear from 2 to 25 mM', 'Smartphone colorimetry, 6 standards', '1 h'],
  ['m8', '2026-09-21', 'inv2', 'protocol', 'worked', 'Switched from drop-cast to spray-coating the enzyme', 'More even color across the spot', '', '2 h'],
];

export const SAMPLE_LOGS = rows.map(([owner, date, invention, type, outcome, did, result, process, duration, visibility = 'lab'], i) => ({
  id: `sample-${i + 1}`,
  owner,
  date,
  invention,
  type,
  outcome,
  did,
  result,
  process,
  duration,
  visibility,
  created: `${date}T17:00:00.000Z`,
  // Sample entries show what the work log looks like; they don't change readiness scores.
  sample: true,
}));
