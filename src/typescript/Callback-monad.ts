type Err = any
type CB<T> = (err?: any, value?: T) => void  // it would have been nice to use a union type as argument. But that doesn't play nice with generics and type erasure.'
type AsyncValue<T> = (g: CB<T>) => void

class Callback<A>{
  constructor(private f: AsyncValue<A>) {
  }

  run(callback: CB<A>): void {
    try {
      return this.f(callback)
    } catch (ex) {
      return callback(ex)
    }
  }

  map<B>(g: (a: A) => B): Callback<B> {
    return new Callback((callback: CB<B>) => {
      this.run((error?: Err, result?: A) => {
        if (!!error) {
          callback(error, undefined)
        } else if(result){
          callback(undefined, g(result))
        } else{
          throw new Error("illegal state")
        }
      })
    })
  }

  bind<B>(g: (a: A) => Callback<B>): Callback<B> {
    return new Callback((callback: CB<B>) => {
      this.run((error?: Err, result?: A) => {
        if (!!error) {
          callback(error, undefined)
        } else if(result){
          g(result).run(callback)
        }else{
          throw new Error("illegal state")
        }
      })
    })
  }

  then<B>(g: (a: A) => B | Callback<B>): Callback<B> {
    return new Callback((callback: CB<B>) => {
      this.run((error?: Err, result?: A) => {
        if (!!error) {
          callback(error, undefined)
        } else if(result){
          try {
            const y: B | Callback<B> = g(result)
            if (y instanceof Callback) {
              y.run(callback)
            } else {
              callback(undefined, y)
            }
          } catch (ex) {
            callback(ex, undefined)
          }
        }else{
          throw new Error("illegal state")
        }
      })
    })
  }

  bindTo(g: (x: A, cb: CB<A>) => void) {
    return this.bind(Callback.from(g))
  }

  static pure<T>(x: T) {
    return new Callback<T>(((cb: CB<T>) => cb(undefined, x)))
  }

  static resolve = Callback.pure

  // Callback.from casts f into a Callback instance, where
  // f is a function that takes x and a callback function
  static from<T>(f: (x: T, cb: CB<T>) => void): (x: T) => Callback<T> {
    return (x: T) => new Callback(cb => f(x, cb))
  }
}


