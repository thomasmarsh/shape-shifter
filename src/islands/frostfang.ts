import { Island, Kind } from '../layout';

// Island 4, for now only a stub: a small snowy island past the Giant's Stair,
// a bunny hop down from the top step. Later passes build the real one.

export const frostfang: Island = {
  id: 'frostfang',
  name: 'Frostfang',
  build(t) {
    // Cloud renders white, which reads as snow.
    t.ellipse(208, 40, 5.2, 5, (i, j) => t.set(i, j, 15, Kind.Cloud));

    return {
      checkpoints: [{ id: 'frostfang', x: 209.5, z: 41.5 }],
      arrivals: [
        {
          id: 'frostfang',
          x: 208,
          z: 40,
          radius: 3.5,
          eyebrow: 'To be continued',
          title: 'Frostfang',
          html: '<p>Three islands crossed, four shapes learned.</p><p class="soft">The <b>Winter Wolf</b> lives here. This island is still being built.</p>',
        },
      ],
    };
  },
};
