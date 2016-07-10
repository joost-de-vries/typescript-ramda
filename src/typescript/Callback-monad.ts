type Err = any
type Try<T> = T | Err   // union types and generics don't seem to mix
type CB<T> = (err?: any, value?: T) => void
type AsyncValue<T> = (g: CB<T>) => Try<T>

class Callback<A>{
  constructor(private f: AsyncValue<A>) {
  }
  // this.run = f
  run(callback: CB<A>): void {
    try {
      return this.f(callback)
    } catch (ex) {
      return callback(ex)
    }
  }
  // this :: Callback x
  // (x -> y) -> Callback y
  map<B>(g: (a: A) => B): Callback<B> {
    return new Callback((callback: CB<B>) => {
      this.run((error?: Err, result?: A) => {
        if (!!error) {
          callback(error, null)
        } else {
          callback(null, g(result))
        }
      })
    })
  }

  // this :: Callback x
  // (x -> Callback y) -> Callback y
  bind<B>(g: (a: A) => Callback<B>): Callback<B> {
    return new Callback((callback: CB<B>) => {
      this.run((error?, result?: A) => {
        if (!!error) {
          callback(error, null)
        } else {
          g(result).run(callback)
        }
      })
    })
  }

  // this :: Callback x
  // x -> (y || Callback y) -> Callback y
  then<B>(g: (a: A) => B | Callback<B>): Callback<B> {
    return new Callback((callback: CB<B>) => {
      this.run((error?, result?: A) => {
        if (!!error) {
          callback(error, null)
        } else {
          try {
            const y: B | Callback<B> = g(result)
            if (y instanceof Callback) {
              y.run(callback)
            } else {
              callback(null, y)
            }
          } catch (ex) {
            callback(ex, null)
          }
        }
      })
    })
  }

  bindTo(g) {
    return this.bind(Callback.from(g))
  }

  // x -> Callback x
  static pure<A>(x: A) {
    return new Callback<A>(((cb: CB<A>) => cb(null, x)))
  }

  static resolve = Callback.pure

  // Callback.from casts f into a Callback instance, where
  // f is a function that takes x and a callback function
  static from<A>(f: (x: A, cb: CB<A>) => Try<A>) {
    return (x: A) => new Callback(cb => f(x, cb))
  }
}


