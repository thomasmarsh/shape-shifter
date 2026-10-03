import { Island, Kind } from '../layout';

// Island 6, for now only a stub: a small sandy island 8 tiles of sky east of
// Underroot's Crown (which is 2 higher), so a Fairy glides down to it. Later
// passes build the real one.

export const saltmere: Island = {
  id: 'saltmere',
  name: 'Saltmere',
  build(t) {
    t.ellipse(491.5, 52, 5.2, 5, (i, j) => t.set(i, j, 38, Kind.Sand));

    return {
      checkpoints: [{ id: 'saltmere', x: 492.5, z: 53.5 }],
      arrivals: [
        {
          id: 'saltmere',
          x: 491.5,
          z: 52,
          radius: 3.5,
          eyebrow: 'To be continued',
          title: 'Saltmere',
          html: '<p>Five islands crossed, six shapes learned.</p><p class="soft">The <b>Mermaid</b> lives here. This island is still being built.</p>',
        },
      ],
    };
  },
};
