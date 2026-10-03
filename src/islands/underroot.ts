import { Island, Kind } from '../layout';

// Island 5, for now only a stub: a small green island at the end of Frostfang's
// last run. Later passes build the real one. Its north edge (z = 46) is level
// with the foot of the run's ramp (height 32), so a Wolf runs straight onto it.

export const underroot: Island = {
  id: 'underroot',
  name: 'Underroot',
  build(t) {
    t.ellipse(304.5, 51, 5.2, 5, (i, j) => t.set(i, j, 32, Kind.Grass));

    return {
      checkpoints: [{ id: 'underroot', x: 305.5, z: 52.5 }],
      arrivals: [
        {
          id: 'underroot',
          x: 304.5,
          z: 51,
          radius: 3.5,
          eyebrow: 'To be continued',
          title: 'Underroot',
          html: '<p>Four islands crossed, five shapes learned.</p><p class="soft">The <b>Ant</b> lives here. This island is still being built.</p>',
        },
      ],
    };
  },
};
